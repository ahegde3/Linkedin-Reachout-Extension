import type { Template } from '../types'

let cachedTemplates: Template[] | null = null

export async function getTemplates(): Promise<Template[]> {
  if (cachedTemplates) {
    return cachedTemplates
  }

  try {
    const response = await fetch(chrome.runtime.getURL('templates.json'))
    const data = await response.json()

    // Ensure each template has an ID if the JSON only contains {name, description, message}
    let index = 0
    cachedTemplates = data.map((t: any) => ({
      id: `template-${index++}`,
      name: t.name,
      description: t.description,
      message: t.message
    }))

    return cachedTemplates || []
  } catch (error) {
    console.error('Error loading templates:', error)
    return []
  }
}

// For synchronous access where async is not possible, we'll need to ensure loadTemplates was called first
// or use the initial empty array
export let templates: Template[] = []

export async function initializeTemplates(): Promise<void> {
  templates = await getTemplates()
}

export function fillTemplate(template: string, data: { firstName: string; company: string }): string {
  return template
    .replace(/\{\{firstName\}\}/g, data.firstName)
    .replace(/\{\{company\}\}/g, data.company)
}


