import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BsPerson } from 'react-icons/bs'
import ErrorBoundary from './ErrorBoundary'
import '../App.css'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const handleSignOut = async () => {
    setMenuOpen(false)
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__start">
          <h1 className="app-header__brand">Neel&apos;s Travel Book</h1>
        </div>
        <div className="app-header__end">
          <div className="profile-menu" ref={menuRef}>
            {user && (
              <>
                <button
                  type="button"
                  className="profile-menu-trigger"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  aria-label="Account menu"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="profile-photo" />
                  ) : (
                    <BsPerson className="profile-icon" aria-hidden />
                  )}
                </button>
                {menuOpen && (
                  <div className="profile-dropdown" role="menu">
                    <button type="button" role="menuitem" onClick={handleSignOut}>
                      Sign out
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>
      <main className="app-main">
        <div className="app-main-outlet">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
