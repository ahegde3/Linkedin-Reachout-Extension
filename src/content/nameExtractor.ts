import type { ProfileData } from '../types'

// LinkedIn DOM selectors for profile data extraction
const SELECTORS = {
  // Profile page selectors
  profileName: 'h1.inline.t-24.v-align-middle.break-words',
  profileNameAlt: 'h1.text-heading-xlarge',
  profileNameFallback: '.pv-text-details__left-panel h1',
  currentCompany: '.pv-text-details__right-panel .inline-show-more-text',
  currentCompanyAlt: 'button[aria-label*="Current company"]',
  experienceSection: '#experience ~ .pvs-list__outer-container .pvs-entity__subtitle',
  
  // Messaging sidebar selectors
  messagingName: '.msg-overlay-conversation-bubble__title',
  messagingNameAlt: '.msg-thread__link-to-profile',
  
  // Connection modal selectors
  connectionProfileName: '.artdeco-modal h2',
}

function extractFirstName(fullName: string): string {
  if (!fullName) return ''
  return fullName.trim().split(' ')[0]
}

function extractFromProfilePage(): ProfileData | null {
  // Try selectors in order of priority
  let nameElement = document.querySelector(SELECTORS.profileName)
  if (!nameElement) {
    nameElement = document.querySelector(SELECTORS.profileNameAlt)
  }
  if (!nameElement) {
    nameElement = document.querySelector(SELECTORS.profileNameFallback)
  }
  
  if (!nameElement) return null
  
  const fullName = nameElement.textContent?.trim() || ''
  const firstName = extractFirstName(fullName)
  const lastName = fullName.split(' ').slice(1).join(' ')
  
  // Try to extract company from various locations
  let company = ''
  
  // Check right panel (current position)
  const companyElement = document.querySelector(SELECTORS.currentCompany)
  if (companyElement) {
    company = companyElement.textContent?.trim() || ''
  }
  
  // Try alternative company selector
  if (!company) {
    const companyButton = document.querySelector(SELECTORS.currentCompanyAlt)
    if (companyButton) {
      const label = companyButton.getAttribute('aria-label') || ''
      company = label.replace('Current company:', '').trim()
    }
  }
  
  // Try experience section
  if (!company) {
    const experienceCompany = document.querySelector(SELECTORS.experienceSection)
    if (experienceCompany) {
      company = experienceCompany.textContent?.trim().split('·')[0].trim() || ''
    }
  }
  
  return {
    firstName,
    lastName,
    fullName,
    company: company || 'your company',
  }
}

function extractFromMessaging(): ProfileData | null {
  // Check if we're in a messaging context
  let nameElement = document.querySelector(SELECTORS.messagingName)
  if (!nameElement) {
    nameElement = document.querySelector(SELECTORS.messagingNameAlt)
  }
  
  if (!nameElement) return null
  
  const fullName = nameElement.textContent?.trim() || ''
  const firstName = extractFirstName(fullName)
  const lastName = fullName.split(' ').slice(1).join(' ')
  
  // Company extraction from messaging is limited
  // We'll use a placeholder
  return {
    firstName,
    lastName,
    fullName,
    company: 'your company',
  }
}

function extractFromConnectionModal(): ProfileData | null {
  const nameElement = document.querySelector(SELECTORS.connectionProfileName)
  
  if (!nameElement) return null
  
  const fullName = nameElement.textContent?.trim() || ''
  const firstName = extractFirstName(fullName)
  const lastName = fullName.split(' ').slice(1).join(' ')
  
  return {
    firstName,
    lastName,
    fullName,
    company: 'your company',
  }
}

export function extractProfileData(): ProfileData {
  // Try different extraction methods in order of priority
  const profileData = extractFromProfilePage()
  if (profileData && profileData.firstName) {
    return profileData
  }
  
  const messagingData = extractFromMessaging()
  if (messagingData && messagingData.firstName) {
    return messagingData
  }
  
  const connectionData = extractFromConnectionModal()
  if (connectionData && connectionData.firstName) {
    return connectionData
  }
  
  // Return default if nothing found
  return {
    firstName: 'there',
    lastName: '',
    fullName: '',
    company: 'your company',
  }
}

