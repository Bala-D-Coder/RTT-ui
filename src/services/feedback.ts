import { apiFetch } from './api-fetch'

export interface FeedbackPayload {
  email: string
  rating: number
  review?: string
  role?: string
  timestamp?: string
}

export interface HireInvitationPayload {
  company: string
  contactName: string
  email: string
  interviewType: string
  roleTitle?: string
  proposedTime?: string
  message?: string
  timestamp?: string
}

const LOCAL_FEEDBACK_KEY = 'rtt_local_feedback'
const LOCAL_HIRE_KEY = 'rtt_local_hire_invitations'
const HIRE_ME_VISIBLE_KEY = 'rtt_show_hire_me'

export function isHireMeVisible(): boolean {
  return localStorage.getItem(HIRE_ME_VISIBLE_KEY) !== 'false'
}

export function setHireMeVisible(visible: boolean): void {
  localStorage.setItem(HIRE_ME_VISIBLE_KEY, visible ? 'true' : 'false')
  window.dispatchEvent(new Event('rtt_hire_me_toggle'))
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ success: boolean; mode: string }> {
  const timestamp = new Date().toISOString()
  const data = { ...payload, type: 'feedback', timestamp }

  // Store locally as immediate backup
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_FEEDBACK_KEY) || '[]')
    list.unshift(data)
    localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(list))
  } catch (err) {
    console.warn('Failed to store feedback locally', err)
  }

  try {
    await apiFetch('/api/v1/feedback', {
      method: 'POST',
      body: payload,
    })
    return { success: true, mode: 'backend' }
  } catch (err) {
    console.warn('Failed to post feedback to backend', err)
    return { success: true, mode: 'local' }
  }
}

export async function submitHireInvitation(payload: HireInvitationPayload): Promise<{ success: boolean; mode: string }> {
  const timestamp = new Date().toISOString()
  const data = { ...payload, type: 'hire_invitation', timestamp }

  // Store locally as immediate backup
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_HIRE_KEY) || '[]')
    list.unshift(data)
    localStorage.setItem(LOCAL_HIRE_KEY, JSON.stringify(list))
  } catch (err) {
    console.warn('Failed to store hire invitation locally', err)
  }

  try {
    await apiFetch('/api/v1/feedback/hire', {
      method: 'POST',
      body: payload,
    })
    return { success: true, mode: 'backend' }
  } catch (err) {
    console.warn('Failed to post hire invitation to backend', err)
    return { success: true, mode: 'local' }
  }
}

export function getLocalFeedbacks(): FeedbackPayload[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_FEEDBACK_KEY) || '[]')
  } catch {
    return []
  }
}

export function getLocalHireInvitations(): HireInvitationPayload[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_HIRE_KEY) || '[]')
  } catch {
    return []
  }
}
