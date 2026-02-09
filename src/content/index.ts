// Content script entry point
import { extractProfileData } from './nameExtractor'
import { injectMessage } from './messageInjector'
import { injectFloatingUI } from './floatingUI'
import type { MessagePayload, MessageResponse } from '../types'

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  (message: MessagePayload, _sender, sendResponse: (response: MessageResponse) => void) => {
    console.log('[Extension] Received message:', message)
    if (message.type === 'GET_PROFILE_DATA') {
      const profileData = extractProfileData()

      sendResponse({
        success: true,
        data: profileData,
      })
    }

    if (message.type === 'INJECT_MESSAGE' && message.template) {
      console.log('[Extension] Attempting to inject message:', message.template)
      const result = injectMessage(message.template)
      console.log('[Extension] Injection result:', result)
      sendResponse({
        success: result.success,
        error: result.success ? undefined : 'Could not find message input field',
      })
    }

    return true // Keep channel open for async response
  }
)

// Log when content script loads
console.log('LinkedIn Template Extension: Content script loaded')

// Inject floating UI on LinkedIn pages
injectFloatingUI()

