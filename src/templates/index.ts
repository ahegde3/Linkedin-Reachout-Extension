import type { Template } from '../types'

export const templates: Template[] = [
  {
    id: 'reachout',
    name: 'Reachout Message',
    message: `Hi {{firstName}},

My name is Anish Hegde, and I’m MS CS graduate student from Northeastern University. As I navigate my own path toward the job market, I’d greatly value the opportunity to connect.

Best regards,
Anish Hegde `,
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

