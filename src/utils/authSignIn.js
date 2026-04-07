/**
 * Firebase Auth: redirect flows rely on sessionStorage. Partitioned / strict
 * browsers can surface "missing initial state" — treat as benign on startup
 * and show a helpful message if sign-in still fails.
 */
export function isBenignRedirectRecoveryError(error) {
  if (!error) return false
  if (error.code === 'auth/missing-initial-state') return true
  const msg = typeof error.message === 'string' ? error.message : ''
  return msg.includes('missing initial state')
}

export function shouldFallbackSignInToRedirect(error) {
  if (!error) return false
  return (
    error.code === 'auth/popup-blocked' ||
    error.code === 'auth/operation-not-supported-in-this-environment'
  )
}

export function formatAuthErrorForUser(error) {
  if (!error) return 'Sign-in failed.'
  if (isBenignRedirectRecoveryError(error)) {
    return (
      'Sign-in could not restore the OAuth session. This often happens in in-app browsers, ' +
      'private mode, or strict privacy settings. Open this site in Safari or Chrome, ' +
      'or use a normal (non-private) window, then try again.'
    )
  }
  return error.message || 'Sign-in failed.'
}
