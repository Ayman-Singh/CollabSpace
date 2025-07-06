'use client'

import { useState } from 'react'
import { User, Wifi, WifiOff, Bell, Settings, LogOut, Search } from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
  avatar?: string
}

interface HeaderProps {
  user: User | null
  isConnected: boolean
}

export function Header({ user, isConnected }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const notifications = [
    {
      id: '1',
      title: 'New collaborator joined',
      message: 'John Doe joined the project',
      time: '2 min ago',
      type: 'info'
    },
    {
      id: '2',
      title: 'Code review completed',
      message: 'Your pull request was approved',
      time: '5 min ago',
      type: 'success'
    },
    {
      id: '3',
      title: 'Build failed',
      message: 'Check the latest commit for errors',
      time: '10 min ago',
      type: 'error'
    }
  ]

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  return (
    <header className="bg-white border-b border-secondary-200 px-6 py-3 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CS</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-secondary-900">
              CollabSpace
            </h1>
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <>
                  <Wifi size={12} className="text-success-500" />
                  <span className="text-xs text-success-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-error-500" />
                  <span className="text-xs text-error-600">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
          <input
            type="text"
            placeholder="Search files, code, or collaborators..."
            className="pl-10 pr-4 py-2 w-80 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-secondary-100 rounded-lg transition-colors duration-200"
          >
            <Bell size={20} className="text-secondary-600" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-error-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-strong border border-secondary-200 z-50">
              <div className="p-4 border-b border-secondary-200">
                <h3 className="font-medium text-secondary-900">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 border-b border-secondary-100 hover:bg-secondary-50 transition-colors duration-200"
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1">
                        <div className="font-medium text-secondary-900 text-sm">
                          {notification.title}
                        </div>
                        <div className="text-secondary-600 text-sm mt-1">
                          {notification.message}
                        </div>
                        <div className="text-secondary-500 text-xs mt-2">
                          {notification.time}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-secondary-200">
                <button className="text-primary-600 text-sm hover:text-primary-700">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2 hover:bg-secondary-100 rounded-lg transition-colors duration-200"
          >
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <User size={16} className="text-primary-700" />
              )}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-secondary-900">
                {user?.username || 'Guest'}
              </div>
              <div className="text-xs text-secondary-600">
                {user?.email || 'guest@collabspace.com'}
              </div>
            </div>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-strong border border-secondary-200 z-50">
              <div className="p-4 border-b border-secondary-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <User size={20} className="text-primary-700" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900">
                      {user?.username || 'Guest'}
                    </div>
                    <div className="text-sm text-secondary-600">
                      {user?.email || 'guest@collabspace.com'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-2">
                <button className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary-50 transition-colors duration-200">
                  <Settings size={16} className="text-secondary-500" />
                  <span className="text-sm text-secondary-700">Settings</span>
                </button>
                <button className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary-50 transition-colors duration-200">
                  <User size={16} className="text-secondary-500" />
                  <span className="text-sm text-secondary-700">Profile</span>
                </button>
                <button className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-error-50 transition-colors duration-200 text-error-600">
                  <LogOut size={16} />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false)
            setShowNotifications(false)
          }}
        />
      )}
    </header>
  )
} 