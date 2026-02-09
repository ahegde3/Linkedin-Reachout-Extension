// LinkedIn message injection utilities

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
    return false;
  }
  const visible = isVisible(el);
  return visible;
}

function findVisibleElement<T extends HTMLElement>(selector: string, typeCheck?: (el: HTMLElement) => el is T): T | null {
  const elements = document.querySelectorAll<HTMLElement>(selector);
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
  // 1) Try LinkedIn's known "Add a note" textarea using robust iteration (Light DOM)
  const byId = findVisibleElement(SELECTORS.connectionNote, (el): el is HTMLTextAreaElement => el instanceof HTMLTextAreaElement);
  if (byId) {
    return byId;
  }

  const byClass = findVisibleElement(SELECTORS.connectionNoteByClass, (el): el is HTMLTextAreaElement => el instanceof HTMLTextAreaElement);
  if (byClass) {
    return byClass;
  }

  // 2) Fallback: textarea inside any dialog
  const dialogSelectors = [SELECTORS.connectionModal, SELECTORS.artdecoModal];
  const dialogs = new Set<HTMLElement>();
  dialogSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => dialogs.add(el as HTMLElement));
  });

  const dialogList = Array.from(dialogs);

  for (const dialog of dialogList) {
    const textareas = dialog.querySelectorAll<HTMLTextAreaElement>("textarea");
    for (const textarea of textareas) {
      if (isConnectionFieldUsable(textarea)) {
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
        return el;
      }
    }
  }

  // 4) BRUTE FORCE with SHADOW DOM Support

  // Predicate: is it a textarea?
  const isTextArea = (el: HTMLElement) => el.tagName === 'TEXTAREA';

  const allTextareas = findAllElements<HTMLTextAreaElement>(document, isTextArea);

  for (const ta of allTextareas) {
    // Visibility check might fail if inside shadow DOM and we don't account for it, 
    // but basic offsetWidth usually works if the shadow host is visible.
    if (isConnectionFieldUsable(ta)) {
      return ta;
    }
  }

  return null;
}

function findMessageComposer(): HTMLElement | null {

  // 0) Check Active Element (User might have clicked it)
  if (document.activeElement instanceof HTMLElement) {
    const active = document.activeElement;
    if (active.isContentEditable || active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') {
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
    for (const el of list) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (isVisible(el)) {
        return el;
      }
    }
  }
  // Last resort: any contenteditable that looks like a message box (placeholder/aria)
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
      return el;
    }
  }
  return null;
}

export function injectMessage(message: string): {
  success: boolean;
  context: string;
} {
  // First try connection note field (for connection requests)
  const connectionField = findConnectionNoteField();
  if (connectionField) {
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
    simulateTyping(composer, message);
    return { success: true, context: "messaging" };
  }

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
