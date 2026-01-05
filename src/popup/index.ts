import { templates, fillTemplate } from '../templates'
import type { ProfileData, MessageResponse } from '../types'

interface State {
  profileData: ProfileData | null
  selectedTemplateId: string | null
  isLoading: boolean
  error: string | null
  statusMessage: { type: 'success' | 'error'; text: string } | null
}

const state: State = {
  profileData: null,
  selectedTemplateId: null,
  isLoading: true,
  error: null,
  statusMessage: null,
}

function getContentElement(): HTMLElement {
  return document.getElementById('content')!
}

function renderNotOnLinkedIn(): void {
  getContentElement().innerHTML = `
    <div class="not-linkedin">
      <div class="not-linkedin-icon">🔗</div>
      <h2>Open LinkedIn First</h2>
      <p>Navigate to a LinkedIn profile or messaging page to use templates.</p>
    </div>
  `
}

function renderMainUI(): void {
  const { profileData, selectedTemplateId, statusMessage } = state
  
  if (!profileData) {
    renderNotOnLinkedIn()
    return
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)
  const previewMessage = selectedTemplate 
    ? fillTemplate(selectedTemplate.message, {
        firstName: profileData.firstName,
        company: profileData.company,
      })
    : ''

  getContentElement().innerHTML = `
    <!-- Profile Card -->
    <div class="profile-card">
      <h2>Recipient</h2>
      <div class="profile-info">
        <span class="profile-name">${profileData.fullName || profileData.firstName}</span>
        <span class="profile-company">${profileData.company}</span>
      </div>
      <div class="profile-status">
        <span class="status-dot"></span>
        <span>Profile detected</span>
      </div>
    </div>

    <!-- Template Selection -->
    <div class="templates-section">
      <h2>Choose Template</h2>
      <div class="template-list">
        ${templates.map(template => `
          <button 
            class="template-btn ${selectedTemplateId === template.id ? 'selected' : ''}" 
            data-template-id="${template.id}"
          >
            <div class="template-btn-content">
              <span class="template-btn-name">${template.name}</span>
              <span class="template-btn-desc">${template.id === 'reachout' ? 'Networking & introductions' : 'Job opportunity requests'}</span>
            </div>
            <span class="template-btn-icon">✓</span>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Preview -->
    ${selectedTemplate ? `
      <div class="preview-section">
        <h2>Preview</h2>
        <div class="preview-box">${previewMessage}</div>
      </div>
    ` : ''}

    <!-- Action Button -->
    <div class="action-section">
      <button class="send-btn" id="inject-btn" ${!selectedTemplateId ? 'disabled' : ''}>
        <span>📝</span>
        Insert Message
      </button>
    </div>

    <!-- Status Message -->
    ${statusMessage ? `
      <div class="status-message ${statusMessage.type}">
        ${statusMessage.text}
      </div>
    ` : ''}
  `

  // Attach event listeners
  attachEventListeners()
}

function attachEventListeners(): void {
  // Template selection buttons
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const templateId = (btn as HTMLElement).dataset.templateId
      if (templateId) {
        state.selectedTemplateId = templateId
        state.statusMessage = null
        renderMainUI()
      }
    })
  })

  // Inject button
  const injectBtn = document.getElementById('inject-btn')
  if (injectBtn) {
    injectBtn.addEventListener('click', handleInjectMessage)
  }
}

async function handleInjectMessage(): Promise<void> {
  if (!state.selectedTemplateId || !state.profileData) return

  const selectedTemplate = templates.find(t => t.id === state.selectedTemplateId)
  if (!selectedTemplate) return

  const message = fillTemplate(selectedTemplate.message, {
    firstName: state.profileData.firstName,
    company: state.profileData.company,
  })

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) throw new Error('No active tab')

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'INJECT_MESSAGE',
      template: message,
    }) as MessageResponse

    if (response.success) {
      state.statusMessage = { type: 'success', text: 'Message inserted successfully!' }
    } else {
      state.statusMessage = { type: 'error', text: response.error || 'Could not insert message' }
    }
  } catch (error) {
    state.statusMessage = { 
      type: 'error', 
      text: 'Open a message thread or click "Connect" first' 
    }
  }

  renderMainUI()
}

async function initialize(): Promise<void> {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    // Check if we're on LinkedIn
    if (!tab.url?.includes('linkedin.com')) {
      state.isLoading = false
      renderNotOnLinkedIn()
      return
    }

    if (!tab.id) {
      throw new Error('No tab ID')
    }

    // Request profile data from content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_PROFILE_DATA',
    }) as MessageResponse

    if (response.success && response.data) {
      state.profileData = response.data
      state.isLoading = false
      renderMainUI()
    } else {
      throw new Error(response.error || 'Failed to get profile data')
    }
  } catch (error) {
    state.isLoading = false
    state.error = 'Could not connect to LinkedIn page'
    renderNotOnLinkedIn()
  }
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', initialize)

