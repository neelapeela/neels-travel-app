import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const OfflineContext = createContext({ isOnline: true })

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine !== false
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const sync = () => setIsOnline(navigator.onLine !== false)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  const value = useMemo(() => ({ isOnline }), [isOnline])
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}

/** Colocated with `OfflineProvider` for a single import path; hook is a thin `useContext` wrapper. */
// eslint-disable-next-line react-refresh/only-export-components -- Fast Refresh: hook + provider belong together
export function useOffline() {
  return useContext(OfflineContext)
}
