import type { Template } from '../types'

export const templates: Template[] = [
  {
    id: 'reachout',
    name: 'Reachout Message',
    message: `Hi {{firstName}},

I came across your profile and was impressed by your experience at {{company}}. I'd love to connect and learn more about your journey.

Looking forward to connecting!`,
  },
  {
    id: 'referral',
    name: 'Referral Request',
    message: `Hi {{firstName}},

I hope this message finds you well! I noticed you work at {{company}} and I'm very interested in opportunities there.

Would you be open to a brief chat about your experience, or potentially referring me if there's a good fit?

Thank you for your time!`,
  },
]

export function fillTemplate(template: string, data: { firstName: string; company: string }): string {
  return template
    .replace(/\{\{firstName\}\}/g, data.firstName)
    .replace(/\{\{company\}\}/g, data.company)
}

