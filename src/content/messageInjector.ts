// LinkedIn message injection utilities

const LOG_PREFIX = "[LI-DEBUG]";

function log(...args: any[]) {
  console.log(LOG_PREFIX, ...args);
}

function warn(...args: any[]) {
  console.warn(LOG_PREFIX, ...args);
}

const SELECTORS = {
  // Messaging composer (multiple possible class names LinkedIn may use)
  messageComposer: ".msg-form__contenteditable",
  messageComposerAlt: '[contenteditable="true"][aria-label*="message"]',
  messageComposerFallback: '[role="textbox"][contenteditable="true"]',
  messageComposerPlaceholder:
    '[contenteditable="true"][data-placeholder*="essage"]',
  messageFormContenteditable:
    '.msg-form__contenteditable, .msg-form [contenteditable="true"]',

  // Connection request note (textarea) - exact IDs/classes from LinkedIn's "Add a note" modal
  connectionNote: "#custom-message",
  connectionNoteByClass: ".connect-button-send-invite__custom-message",
  connectionNoteFallback: '[role="dialog"] textarea',
  connectionNoteContenteditable: '[role="dialog"] [contenteditable="true"]',

  // InMail composer (if needed)
  inmailComposer: ".compose-form__message-field",

  // Modal (Robust)
  connectionModal: '[role="dialog"]',
  artdecoModal: ".artdeco-modal",
};

// Helper to check visibility (relaxed so we don't miss elements inside modals/panels)
function isVisible(element: HTMLElement): boolean {
  // Check if element has size (standard way to check if rendered)
  if (element.offsetWidth > 0 || element.offsetHeight > 0) {
    return true;
  }

  // Fallback: check client rects (handles inline elements with no width/height but content)
  if (element.getClientRects().length > 0) {
    return true;
  }

  // Debug why it's hidden
  // log("Element considered hidden (no size):", element);
  return false;
}

function simulateTyping(element: HTMLElement, text: string): void {
  // Focus the element
  element.focus();

  // For contenteditable elements
  if (element.getAttribute("contenteditable") === "true") {
    // Clear existing content
    element.innerHTML = "";

    // Create a text node and insert
    const textNode = document.createTextNode(text);
    element.appendChild(textNode);

    // Dispatch input event to trigger LinkedIn's listeners
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: text,
      })
    );

    // Also dispatch change event
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function fillTextarea(textarea: HTMLTextAreaElement, text: string): void {
  textarea.focus();
  textarea.value = text;

  // Dispatch events to trigger LinkedIn's listeners
  textarea.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: text,
    })
  );

  textarea.dispatchEvent(new Event("change", { bubbles: true }));
}

// Connection modal can be in an overlay that fails isVisible(); check the input itself.
// UPDATED: Using isVisible on the element itself is safer than just display check.
function isConnectionFieldUsable(el: HTMLElement): boolean {
  if (!el.isConnected) {
    log("Element not connected:", el);
    return false;
  }
  const visible = isVisible(el);
  if (!visible) {
    log("Element not visible:", el);
  }
  return visible;
}

function findVisibleElement<T extends HTMLElement>(selector: string, typeCheck?: (el: HTMLElement) => el is T): T | null {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  log(`Checking selector: ${selector}, found: ${elements.length}`);
  for (const el of elements) {
    if (typeCheck && !typeCheck(el)) continue;
    if (isConnectionFieldUsable(el)) return el as T;
  }
  return null;
}

// Helper to find all elements matching a predicate, traversing Shadow DOM
function findAllElements<T extends HTMLElement>(
  root: Document | ShadowRoot | HTMLElement,
  predicate: (el: HTMLElement) => boolean,
  results: T[] = []
): T[] {
  // Check children
  const children = root.querySelectorAll<HTMLElement>("*");
  for (const child of children) {
    if (predicate(child)) {
      results.push(child as T);
    }
    // Check shadow root
    if (child.shadowRoot) {
      findAllElements(child.shadowRoot, predicate, results);
    }
  }
  return results;
}

function findConnectionNoteField(): HTMLTextAreaElement | HTMLElement | null {
  log("Finding connection note field...");
  log("Context:", {
    url: window.location.href,
    isTop: window.self === window.top,
    readyState: document.readyState,
    bodyLength: document.body.innerHTML.length,
    iframes: document.querySelectorAll('iframe').length,
    shadowRoots: Array.from(document.querySelectorAll('*')).filter(el => el.shadowRoot).length
  });

  // 1) Try LinkedIn's known "Add a note" textarea using robust iteration (Light DOM)
  const byId = findVisibleElement(SELECTORS.connectionNote, (el): el is HTMLTextAreaElement => el instanceof HTMLTextAreaElement);
  if (byId) {
    log("Found via ID:", byId);
    return byId;
  }

  const byClass = findVisibleElement(SELECTORS.connectionNoteByClass, (el): el is HTMLTextAreaElement => el instanceof HTMLTextAreaElement);
  if (byClass) {
    log("Found via Class:", byClass);
    return byClass;
  }

  // 2) Fallback: textarea inside any dialog
  const dialogSelectors = [SELECTORS.connectionModal, SELECTORS.artdecoModal];
  const dialogs = new Set<HTMLElement>();
  dialogSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => dialogs.add(el as HTMLElement));
  });

  const dialogList = Array.from(dialogs);
  log(`Found ${dialogList.length} potential dialogs`);

  for (const dialog of dialogList) {
    const textareas = dialog.querySelectorAll<HTMLTextAreaElement>("textarea");
    for (const textarea of textareas) {
      if (isConnectionFieldUsable(textarea)) {
        log("Found textarea inside dialog:", dialog);
        return textarea;
      }
    }
  }

  // 3) Contenteditable inside dialog (if LinkedIn switches to that)
  for (const dialog of dialogList) {
    const editables = dialog.querySelectorAll<HTMLElement>(
      '[contenteditable="true"]'
    );
    for (const el of editables) {
      if (!isConnectionFieldUsable(el)) continue;
      const text = (
        el.getAttribute("aria-label") ||
        el.getAttribute("data-placeholder") ||
        el.textContent ||
        ""
      ).toLowerCase();
      if (
        text.includes("note") ||
        text.includes("message") ||
        text.includes("add")
      ) {
        log("Found contenteditable inside dialog:", el);
        return el;
      }
    }
  }

  // 4) BRUTE FORCE with SHADOW DOM Support
  log("Running brute force textarea search (Deep scan)...");

  // Predicate: is it a textarea?
  const isTextArea = (el: HTMLElement) => el.tagName === 'TEXTAREA';

  const allTextareas = findAllElements<HTMLTextAreaElement>(document, isTextArea);
  log(`Found ${allTextareas.length} total textareas in deep scan`);

  for (const ta of allTextareas) {
    // Visibility check might fail if inside shadow DOM and we don't account for it, 
    // but basic offsetWidth usually works if the shadow host is visible.
    // Let's log details of what we found
    // log("Checking deep scan textarea:", ta);
    if (isConnectionFieldUsable(ta)) {
      log("Found visible textarea via deep scan:", ta);
      return ta;
    }
  }

  log("No connection note field found.");
  return null;
}

function findMessageComposer(): HTMLElement | null {
  log("Finding message composer...");

  // 0) Check Active Element (User might have clicked it)
  if (document.activeElement instanceof HTMLElement) {
    const active = document.activeElement;
    if (active.isContentEditable || active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') {
      log("Found likely composer via activeElement:", active);
      // Optional: verify it looks like a message field? 
      // For now, if user is focused on it and asking to inject, assume it's the target.
      return active;
    }
  }

  // Strategy: Find any visible contenteditable element that looks like a message input
  const selectors = [
    SELECTORS.messageComposer,
    SELECTORS.messageFormContenteditable,
    SELECTORS.messageComposerAlt,
    SELECTORS.messageComposerPlaceholder,
    SELECTORS.inmailComposer,
    SELECTORS.messageComposerFallback,
  ];
  const seen = new Set<HTMLElement>();
  for (const sel of selectors) {
    const list = document.querySelectorAll<HTMLElement>(sel);
    log(`Checking selector: ${sel}, found: ${list.length}`);
    for (const el of list) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (isVisible(el)) {
        log("Found visible composer via selector:", sel, el);
        return el;
      }
    }
  }
  // Last resort: any contenteditable that looks like a message box (placeholder/aria)
  log("Checking fallback contenteditable logic...");
  const anyEditable = document.querySelectorAll<HTMLElement>(
    '[contenteditable="true"]'
  );
  for (const el of anyEditable) {
    if (seen.has(el) || !isVisible(el)) continue;
    const label = (
      el.getAttribute("aria-label") ||
      el.getAttribute("data-placeholder") ||
      ""
    ).toLowerCase();
    if (
      label.includes("message") ||
      label.includes("write") ||
      label.includes("note")
    ) {
      log("Found composer via fallback logic:", el);
      return el;
    }
  }
  log("No message composer found.");
  return null;
}

export function injectMessage(message: string): {
  success: boolean;
  context: string;
} {
  log("Starting injectMessage...");
  // First try connection note field (for connection requests)
  const connectionField = findConnectionNoteField();
  if (connectionField) {
    log("Injecting into connection field", connectionField);
    if (connectionField instanceof HTMLTextAreaElement) {
      fillTextarea(connectionField, message);
    } else {
      simulateTyping(connectionField as HTMLElement, message);
    }
    return { success: true, context: "connection" };
  }

  // Then try message composer
  const composer = findMessageComposer();
  if (composer) {
    log("Injecting into message composer", composer);
    simulateTyping(composer, message);
    return { success: true, context: "messaging" };
  }

  warn("injectMessage failed: no field found");
  return { success: false, context: "none" };
}

export function detectContext():
  | "profile"
  | "messaging"
  | "connection"
  | "unknown" {
  const url = window.location.href;

  // Reuse logic: is there a visible dialog that looks like a connection modal?
  const dialogSelectors = [SELECTORS.connectionModal, SELECTORS.artdecoModal];
  const allDialogs = new Set<HTMLElement>();
  dialogSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => allDialogs.add(el as HTMLElement));
  });

  const visibleDialog = Array.from(allDialogs).find((d) => isVisible(d));
  log("visibleDialog", visibleDialog);
  if (visibleDialog) {
    const modalText = visibleDialog.textContent?.toLowerCase() || "";
    if (
      modalText.includes("add a note") ||
      (modalText.includes("connect") && modalText.includes("invite")) ||
      modalText.includes("invitation")
    ) {
      return "connection";
    }
  }

  if (url.includes("/in/")) {
    return "profile";
  }

  if (url.includes("/messaging/")) {
    return "messaging";
  }

  return "unknown";
}
