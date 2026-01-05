// LinkedIn message injection utilities

const SELECTORS = {
  // Messaging composer
  messageComposer: '.msg-form__contenteditable',
  messageComposerAlt: '[contenteditable="true"][aria-label*="message"]',
  
  // Connection request note
  connectionNote: '#custom-message',
  connectionNoteAlt: 'textarea[name="message"]',
  
  // InMail composer (if needed)
  inmailComposer: '.compose-form__message-field',
}

function simulateTyping(element: HTMLElement, text: string): void {
  // Focus the element
  element.focus()
  
  // For contenteditable elements
  if (element.getAttribute('contenteditable') === 'true') {
    // Clear existing content
    element.innerHTML = ''
    
    // Create a text node and insert
    const textNode = document.createTextNode(text)
    element.appendChild(textNode)
    
    // Dispatch input event to trigger LinkedIn's listeners
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text,
    }))
    
    // Also dispatch change event
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

function fillTextarea(textarea: HTMLTextAreaElement, text: string): void {
  textarea.focus()
  textarea.value = text
  
  // Dispatch events to trigger LinkedIn's listeners
  textarea.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
    data: text,
  }))
  
  textarea.dispatchEvent(new Event('change', { bubbles: true }))
}

function findMessageComposer(): HTMLElement | null {
  // Try primary selector
  let composer = document.querySelector(SELECTORS.messageComposer) as HTMLElement
  if (composer) return composer
  
  // Try alternative selector
  composer = document.querySelector(SELECTORS.messageComposerAlt) as HTMLElement
  if (composer) return composer
  
  // Try InMail composer
  composer = document.querySelector(SELECTORS.inmailComposer) as HTMLElement
  if (composer) return composer
  
  return null
}

function findConnectionNoteField(): HTMLTextAreaElement | null {
  // Try primary selector
  let field = document.querySelector(SELECTORS.connectionNote) as HTMLTextAreaElement
  if (field) return field
  
  // Try alternative selector
  field = document.querySelector(SELECTORS.connectionNoteAlt) as HTMLTextAreaElement
  if (field) return field
  
  return null
}

export function injectMessage(message: string): { success: boolean; context: string } {
  // First try connection note field (for connection requests)
  const connectionField = findConnectionNoteField()
  if (connectionField) {
    fillTextarea(connectionField, message)
    return { success: true, context: 'connection' }
  }
  
  // Then try message composer
  const composer = findMessageComposer()
  if (composer) {
    simulateTyping(composer, message)
    return { success: true, context: 'messaging' }
  }
  
  return { success: false, context: 'none' }
}

export function detectContext(): 'profile' | 'messaging' | 'connection' | 'unknown' {
  const url = window.location.href
  
  if (url.includes('/in/')) {
    return 'profile'
  }
  
  if (url.includes('/messaging/')) {
    return 'messaging'
  }
  
  // Check for connection modal
  const connectionModal = document.querySelector('.artdeco-modal')
  if (connectionModal) {
    const modalText = connectionModal.textContent?.toLowerCase() || ''
    if (modalText.includes('connect') || modalText.includes('add a note')) {
      return 'connection'
    }
  }
  
  return 'unknown'
}

