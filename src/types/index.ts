export interface ProfileData {
  firstName: string
  lastName: string
  fullName: string
  company: string
}

export interface Template {
  id: string
  name: string
  message: string
}

export interface MessagePayload {
  type: 'GET_PROFILE_DATA' | 'INJECT_MESSAGE'
  template?: string
}

export interface MessageResponse {
  success: boolean
  data?: ProfileData
  error?: string
}

