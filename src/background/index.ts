// Background service worker for LinkedIn Template Extension
// Handles any cross-context communication if needed

chrome.runtime.onInstalled.addListener(() => {
  console.log('LinkedIn Template Extension installed')
})

// Keep service worker alive
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'alive' })
  }
  return true
})

