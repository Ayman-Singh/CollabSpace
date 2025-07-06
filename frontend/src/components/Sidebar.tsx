'use client'

import { useState } from 'react'
import { Code, MessageCircle, Video, Trello, Users, Settings, Bell } from 'lucide-react'

interface SidebarProps {
  activeTab: 'editor' | 'chat' | 'video' | 'kanban'
  onTabChange: (tab: 'editor' | 'chat' | 'video' | 'kanban') => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [notifications, setNotifications] = useState(3)
  const [onlineUsers, setOnlineUsers] = useState([
    { id: '1', name: 'John Doe', status: 'online', avatar: 'JD' },
    { id: '2', name: 'Jane Smith', status: 'online', avatar: 'JS' },
    { id: '3', name: 'Mike Johnson', status: 'away', avatar: 'MJ' },
    { id: '4', name: 'Sarah Wilson', status: 'offline', avatar: 'SW' }
  ])

  const tabs = [
    {
      id: 'editor' as const,
      label: 'Code Editor',
      icon: Code,
      description: 'Real-time collaborative coding'
    },
    {
      id: 'chat' as const,
      label: 'Chat',
      icon: MessageCircle,
      description: 'Team communication'
    },
    {
      id: 'video' as const,
      label: 'Video Call',
      icon: Video,
      description: 'Face-to-face meetings'
    },
    {
      id: 'kanban' as const,
      label: 'Kanban Board',
      icon: Trello,
      description: 'Task management'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-success-500'
      case 'away':
        return 'bg-warning-500'
      case 'offline':
        return 'bg-secondary-400'
      default:
        return 'bg-secondary-400'
    }
  }

  return (
    <div className="w-64 bg-white border-r border-secondary-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-secondary-200">
        <h2 className="text-lg font-semibold text-secondary-900 mb-1">
          CollabSpace
        </h2>
        <p className="text-sm text-secondary-600">
          Real-time collaboration platform
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-50 border border-primary-200 text-primary-700'
                    : 'hover:bg-secondary-50 text-secondary-700'
                }`}
              >
                <Icon size={20} className="mr-3" />
                <div className="text-left">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs text-secondary-500">
                    {tab.description}
                  </div>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Online Users */}
      <div className="p-4 border-t border-secondary-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-secondary-900">Team Members</h3>
          <div className="flex items-center space-x-1">
            <Users size={16} className="text-secondary-500" />
            <span className="text-sm text-secondary-600">
              {onlineUsers.filter(u => u.status === 'online').length} online
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          {onlineUsers.map((user) => (
            <div key={user.id} className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-medium text-primary-700">
                  {user.avatar}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-secondary-900 truncate">
                  {user.name}
                </div>
                <div className="text-xs text-secondary-500 capitalize">
                  {user.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-secondary-200">
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary-50 transition-colors duration-200">
            <div className="flex items-center space-x-2">
              <Bell size={16} className="text-secondary-500" />
              <span className="text-sm text-secondary-700">Notifications</span>
            </div>
            {notifications > 0 && (
              <span className="bg-error-500 text-white text-xs px-2 py-1 rounded-full">
                {notifications}
              </span>
            )}
          </button>
          
          <button className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary-50 transition-colors duration-200">
            <Settings size={16} className="text-secondary-500" />
            <span className="text-sm text-secondary-700">Settings</span>
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="p-4 border-t border-secondary-200 bg-secondary-50">
        <div className="text-xs text-secondary-600">
          <div className="font-medium mb-1">Current Project</div>
          <div>CollabSpace Platform</div>
          <div className="mt-2">
            <div className="flex justify-between">
              <span>Last saved:</span>
              <span>2 min ago</span>
            </div>
            <div className="flex justify-between">
              <span>Collaborators:</span>
              <span>{onlineUsers.filter(u => u.status === 'online').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 