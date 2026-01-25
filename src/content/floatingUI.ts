// Floating UI for LinkedIn Template Extension
// Injects a floating button and panel directly into LinkedIn pages

import { extractProfileData } from './nameExtractor'
import { injectMessage } from './messageInjector'
import { templates, fillTemplate } from '../templates'
import type { ProfileData } from '../types'
import floatingStyles from './floatingUI.css?inline'

interface FloatingUIState {
  isOpen: boolean
  profileData: ProfileData | null
  selectedTemplateId: string | null
  statusMessage: { type: 'success' | 'error'; text: string } | null
}

const state: FloatingUIState = {
  isOpen: false,
  profileData: null,
  selectedTemplateId: null,
  statusMessage: null,
}

let shadowRoot: ShadowRoot | null = null
let panelElement: HTMLElement | null = null
let buttonElement: HTMLElement | null = null

function createFloatingButton(): HTMLElement {
  const button = document.createElement('div')
  button.id = 'linkedin-template-floating-btn'
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H6.5v-7H9v7zM7.7 8.7c-.8 0-1.3-.5-1.3-1.2s.5-1.2 1.4-1.2c.8 0 1.3.5 1.3 1.2s-.5 1.2-1.4 1.2zM18 17h-2.4v-3.8c0-1.1-.7-1.3-1-1.3-.3 0-1.1.1-1.1 1.3V17h-2.5v-7h2.5v1c.3-.6 1-1.2 2.2-1.2s2.3.9 2.3 3v4.2z"/>
    </svg>
  `
  button.addEventListener('click', togglePanel)
  return button
}

function createFloatingPanel(): HTMLElement {
  const panel = document.createElement('div')
  panel.id = 'linkedin-template-floating-panel'
  panel.classList.add('closed')
  return panel
}

function renderPanelContent(): void {
  if (!panelElement) return

  const { profileData, selectedTemplateId, statusMessage } = state

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)
  const previewMessage = selectedTemplate && profileData
    ? fillTemplate(selectedTemplate.message, {
        firstName: profileData.firstName,
        company: profileData.company,
      })
    : ''

  panelElement.innerHTML = `
    <div class="panel-container">
      <!-- Header -->
      <div class="panel-header">
        <div class="header-left">
          <div class="logo">in</div>
          <div class="header-text">
            <h1>Template Messages</h1>
            <p>Quick personalized outreach</p>
          </div>
        </div>
        <button class="close-btn" id="close-panel-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="panel-content">
        ${!profileData ? `
          <div class="not-linkedin">
            <div class="not-linkedin-icon">🔗</div>
            <h2>Navigate to a Profile</h2>
            <p>Open a LinkedIn profile or messaging page to use templates.</p>
          </div>
        ` : `
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
        `}
      </div>
    </div>
  `

  attachPanelEventListeners()
}

function attachPanelEventListeners(): void {
  if (!shadowRoot) return

  // Close button
  const closeBtn = shadowRoot.getElementById('close-panel-btn')
  if (closeBtn) {
    closeBtn.addEventListener('click', closePanel)
  }

  // Template selection buttons
  shadowRoot.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const templateId = (btn as HTMLElement).dataset.templateId
      if (templateId) {
        state.selectedTemplateId = templateId
        state.statusMessage = null
        renderPanelContent()
      }
    })
  })

  // Inject button
  const injectBtn = shadowRoot.getElementById('inject-btn')
  if (injectBtn) {
    injectBtn.addEventListener('click', handleInjectMessage)
  }
}

function handleInjectMessage(): void {
  if (!state.selectedTemplateId || !state.profileData) return

  const selectedTemplate = templates.find(t => t.id === state.selectedTemplateId)
  if (!selectedTemplate) return

  const message = fillTemplate(selectedTemplate.message, {
    firstName: state.profileData.firstName,
    company: state.profileData.company,
  })

  const result = injectMessage(message)

  if (result.success) {
    state.statusMessage = { type: 'success', text: 'Message inserted successfully!' }
    // Auto-close panel after successful injection
    setTimeout(() => {
      closePanel()
      state.statusMessage = null
    }, 1500)
  } else {
    state.statusMessage = { type: 'error', text: 'Open a message thread or click "Connect" first' }
  }

  renderPanelContent()
}

function togglePanel(): void {
  if (state.isOpen) {
    closePanel()
  } else {
    openPanel()
  }
}

function openPanel(): void {
  if (!panelElement || !buttonElement) return

  // Refresh profile data each time panel opens
  state.profileData = extractProfileData()
  state.isOpen = true
  state.statusMessage = null

  panelElement.classList.remove('closed')
  panelElement.classList.add('open')
  buttonElement.classList.add('active')

  renderPanelContent()
}

function closePanel(): void {
  if (!panelElement || !buttonElement) return

  state.isOpen = false
  panelElement.classList.remove('open')
  panelElement.classList.add('closed')
  buttonElement.classList.remove('active')
}

function handleEscapeKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && state.isOpen) {
    closePanel()
  }
}

function handleOutsideClick(event: MouseEvent): void {
  if (!state.isOpen || !shadowRoot) return

  const target = event.target as Node
  const container = shadowRoot.host

  // Check if click is outside the shadow host
  if (!container.contains(target)) {
    closePanel()
  }
}

export function injectFloatingUI(): void {
  // Don't inject if already present
  if (document.getElementById('linkedin-template-extension-root')) return

  // Create shadow DOM container
  const container = document.createElement('div')
  container.id = 'linkedin-template-extension-root'
  shadowRoot = container.attachShadow({ mode: 'open' })

  // Inject styles into shadow DOM
  const styleElement = document.createElement('style')
  styleElement.textContent = floatingStyles
  shadowRoot.appendChild(styleElement)

  // Create and append button
  buttonElement = createFloatingButton()
  shadowRoot.appendChild(buttonElement)

  // Create and append panel
  panelElement = createFloatingPanel()
  shadowRoot.appendChild(panelElement)

  // Append container to body
  document.body.appendChild(container)

  // Set up global event listeners
  document.addEventListener('keydown', handleEscapeKey)
  document.addEventListener('click', handleOutsideClick)

  console.log('LinkedIn Template Extension: Floating UI injected')
}

export function removeFloatingUI(): void {
  const container = document.getElementById('linkedin-template-extension-root')
  if (container) {
    container.remove()
  }

  document.removeEventListener('keydown', handleEscapeKey)
  document.removeEventListener('click', handleOutsideClick)

  shadowRoot = null
  panelElement = null
  buttonElement = null
}
