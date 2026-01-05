// Content script entry point
import { extractProfileData } from './nameExtractor'
import { injectMessage } from './messageInjector'
import type { MessagePayload, MessageResponse } from '../types'

// Listen for messages from popup
chrome.runtime.onMessage.addListener(
  (message: MessagePayload, _sender, sendResponse: (response: MessageResponse) => void) => {
    if (message.type === 'GET_PROFILE_DATA') {
      const profileData = extractProfileData()
      
      sendResponse({
        success: true,
        data: profileData,
      })
    }
    
    if (message.type === 'INJECT_MESSAGE' && message.template) {
      const result = injectMessage(message.template)
      
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

