import { Outlet, useNavigate } from 'react-router-dom'
import { Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { BsPerson } from 'react-icons/bs'
import '../App.css'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-left"> 
          <h1>Travel Itinerary App</h1>
        </div>
        <div className="header-right">
          <div className="profile-menu">
            {user &&
            <Menu>
              <MenuButton 
                as="button"
                style={{ background: 'transparent', border: 'none', padding: 0 }}
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="profile-photo" />
                ) : (
                  <BsPerson className="profile-icon" />
                )}
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
              </MenuList>
            </Menu>
            }
          </div>
        </div>
      </div>
      <main className="app-main">
        <div className="app-main-outlet">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
