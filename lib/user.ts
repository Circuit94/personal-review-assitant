/**
 * Simple anonymous user ID management using localStorage.
 * Generates a persistent ID so data is tied to the browser session.
 */

const USER_ID_KEY = 'interview-assistant-user-id'

function generateId(): string {
  return 'user-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

export function getUserId(): string {
  if (typeof window === 'undefined') return 'server-user'

  let userId = localStorage.getItem(USER_ID_KEY)
  if (!userId) {
    userId = generateId()
    localStorage.setItem(USER_ID_KEY, userId)
  }
  return userId
}
