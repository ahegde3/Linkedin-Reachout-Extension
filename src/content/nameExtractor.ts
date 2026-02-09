import type { ProfileData } from '../types'

// LinkedIn DOM selectors for profile data extraction
const SELECTORS = {
  // Classic selectors (legacy)
  profileName: 'h1.inline.t-24.v-align-middle.break-words',
  profileNameAlt: 'h1.text-heading-xlarge',
  profileNameFallback: '.pv-text-details__left-panel h1',
  currentCompany: '.pv-text-details__right-panel .inline-show-more-text',
  currentCompanyAlt: 'button[aria-label*="Current company"]',
  experienceSection: '#experience ~ .pvs-list__outer-container .pvs-entity__subtitle',

  // New SDUI selectors (2024+)
  // We target stable data attributes used by LinkedIn's own code/analytics
  sduiProfileTopCard: '[data-view-name="profile-top-card-verified-badge"]',
  sduiProfileName: '[data-view-name="profile-top-card-verified-badge"] h2, [data-view-name="profile-top-card-verified-badge"] h1',

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
  // Strategy 1: New SDUI Selectors (Stable Data Attributes)
  // This layout uses hashed classes but stable data-view-name attributes
  const sduiNameElement = document.querySelector(SELECTORS.sduiProfileName)
  if (sduiNameElement) {
    const fullName = sduiNameElement.textContent?.trim() || ''

    // In SDUI, the company is often just the second/third paragraph in the top card
    // or linked via an image alt tag or aria-label.
    // We'll try a heuristic: looking for the 'text-body-small' or similar structure isn't reliable due to hashes.
    // Instead, let's look for the element that *might* be the company.

    let company = ''
    const topCard = document.querySelector(SELECTORS.sduiProfileTopCard)
    if (topCard) {
      // Heuristic: The company name is often in a button or link with specific aria-labels,
      // OR it's a simple paragraph following the headline.
      // Let's try to find an aria-label containing "Current company" first (if they kept it)
      const companyBtn = topCard.querySelector('[aria-label*="Current company"]')
      if (companyBtn) {
        company = companyBtn.getAttribute('aria-label')?.replace('Current company:', '').trim() || ''
      }

      // Fallback Heuristic in SDUI: look for the list of items (location, company)
      if (!company) {
        // Often the company logo has an alt text
        const companyLogo = topCard.querySelector('ul img[alt]')
        if (companyLogo) {
          const alt = companyLogo.getAttribute('alt')
          if (alt && alt !== 'Current company') company = alt
        }
      }
    }

    if (fullName) {
      return {
        firstName: extractFirstName(fullName),
        lastName: fullName.split(' ').slice(1).join(' '),
        fullName,
        company: company || 'your company' // Fallback if we can't find company
      }
    }
  }

  // Strategy 2: Legacy Selectors
  let nameElement = document.querySelector(SELECTORS.profileName)
  if (!nameElement) {
    nameElement = document.querySelector(SELECTORS.profileNameAlt)
  }
  if (!nameElement) {
    nameElement = document.querySelector(SELECTORS.profileNameFallback)
  }

  if (nameElement) {
    const fullName = nameElement.textContent?.trim() || ''

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
      firstName: extractFirstName(fullName),
      lastName: fullName.split(' ').slice(1).join(' '),
      fullName,
      company: company || 'your company',
    }
  }

  // Strategy 3: Last Resort Heuristics
  // Find the largest heading on the page that isn't the site logo/nav
  // This is risky but better than failing
  // This is risky but better than failing
  // Sort by font size (descending) if we could compute styles, but we can't easily in content script without perf hit.
  // Instead, assume the profile name is near the top of the 'main' content.
  const main = document.querySelector('main')
  if (main) {
    const possibleName = main.querySelector('h1, h2')
    if (possibleName) {
      const fullName = possibleName.textContent?.trim() || ''
      if (fullName.length > 2 && fullName.length < 50) { // Basic sanity check
        return {
          firstName: extractFirstName(fullName),
          lastName: fullName.split(' ').slice(1).join(' '),
          fullName,
          company: 'your company'
        }
      }
    }
  }

  return null
}

function extractFromMessaging(): ProfileData | null {
  // Check if we're in a messaging context
  let nameElement = document.querySelector(SELECTORS.messagingName)
  if (!nameElement) {
    nameElement = document.querySelector(SELECTORS.messagingNameAlt)
  }

  if (!nameElement) return null

  const fullName = nameElement.textContent?.trim() || ''

  return {
    firstName: extractFirstName(fullName),
    lastName: fullName.split(' ').slice(1).join(' '),
    fullName,
    company: 'your company',
  }
}

function extractFromConnectionModal(): ProfileData | null {
  const nameElement = document.querySelector(SELECTORS.connectionProfileName)

  if (!nameElement) return null

  const fullName = nameElement.textContent?.trim() || ''

  return {
    firstName: extractFirstName(fullName),
    lastName: fullName.split(' ').slice(1).join(' '),
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

