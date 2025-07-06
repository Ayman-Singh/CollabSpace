'use client'

import { useState, useEffect } from 'react'
import { CodeEditor } from '@/components/CodeEditor'
import { Sidebar } from '@/components/Sidebar'
import { ChatPanel } from '@/components/ChatPanel'
import { VideoCall } from '@/components/VideoCall'
import { KanbanBoard } from '@/components/KanbanBoard'
import { Header } from '@/components/Header'
import { useSocket } from '@/hooks/useSocket'
import { useAuth } from '@/hooks/useAuth'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'editor' | 'chat' | 'video' | 'kanban'>('editor')
  const [isConnected, setIsConnected] = useState(false)
  const { socket } = useSocket()
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        setIsConnected(true)
        console.log('Connected to server')
      })

      socket.on('disconnect', () => {
        setIsConnected(false)
        console.log('Disconnected from server')
      })

      return () => {
        socket.off('connect')
        socket.off('disconnect')
      }
    }
  }, [socket])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="card max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6 gradient-text">
            Welcome to CollabSpace
          </h1>
          <p className="text-secondary-600 text-center mb-8">
            Please sign in to access the collaboration platform
          </p>
          <button className="btn-primary w-full">
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header user={user} isConnected={isConnected} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 flex flex-col">
          {activeTab === 'editor' && (
            <div className="flex-1 flex">
              <div className="flex-1">
                <CodeEditor />
              </div>
              <div className="w-80 border-l border-secondary-200">
                <ChatPanel />
              </div>
            </div>
          )}
          
          {activeTab === 'chat' && (
            <div className="flex-1 p-6">
              <ChatPanel fullScreen />
            </div>
          )}
          
          {activeTab === 'video' && (
            <div className="flex-1 p-6">
              <VideoCall />
            </div>
          )}
          
          {activeTab === 'kanban' && (
            <div className="flex-1 p-6">
              <KanbanBoard />
            </div>
          )}
        </main>
      </div>
    </div>
  )
} 