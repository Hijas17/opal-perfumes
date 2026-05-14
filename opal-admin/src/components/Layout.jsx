import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/products/new': 'Add Product',
  '/categories': 'Categories',
  '/inquiries': 'Inquiries',
  '/media': 'Media Library',
  '/settings': 'Settings',
}

function getPageTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.match(/^\/products\/\d+\/edit$/)) return 'Edit Product'
  return 'Opal Admin'
}

export default function Layout({ children }) {
  const { admin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const pageTitle = getPageTitle(location.pathname)

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{admin?.email}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300 px-3 py-1.5 rounded transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
