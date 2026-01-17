import { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BsPerson } from 'react-icons/bs'
import '../App.css'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProfileClick = () => {
    setDropdownOpen(!dropdownOpen)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setDropdownOpen(false)
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-left"> 
          <h1>Neel's Travel App</h1>
        </div>
        <div className="header-right">
          <div className="profile-menu" ref={dropdownRef}>
            <button className="profile-button" onClick={handleProfileClick}>
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="profile-photo"
                />
              ) : (
                <BsPerson className="profile-icon" />
              )}
            </button>
            {dropdownOpen && user && (
              <div className="profile-dropdown">
                <button className="dropdown-item" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
