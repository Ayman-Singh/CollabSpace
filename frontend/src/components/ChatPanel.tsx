'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, Smile, MoreVertical } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { useAuth } from '@/hooks/useAuth'

interface Message {
  id: string
  userId: string
  username: string
  content: string
  timestamp: number
  type: 'text' | 'code' | 'file' | 'system'
  isAI?: boolean
}

interface ChatPanelProps {
  fullScreen?: boolean
}

export function ChatPanel({ fullScreen = false }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      userId: 'system',
      username: 'System',
      content: 'Welcome to CollabSpace! Start collaborating with your team.',
      timestamp: Date.now() - 60000,
      type: 'system'
    },
    {
      id: '2',
      userId: 'ai',
      username: 'AI Assistant',
      content: 'I\'m here to help with code suggestions and answer questions!',
      timestamp: Date.now() - 30000,
      type: 'text',
      isAI: true
    },
    {
      id: '3',
      userId: 'user1',
      username: 'John Doe',
      content: 'Hey team! I\'ve been working on the authentication module.',
      timestamp: Date.now() - 15000,
      type: 'text'
    },
    {
      id: '4',
      userId: 'user2',
      username: 'Jane Smith',
      content: 'Great! I can help review the code once you push it.',
      timestamp: Date.now() - 10000,
      type: 'text'
    }
  ])
  
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { socket } = useSocket()
  const { user } = useAuth()

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (socket && user) {
      // Join chat room
      socket.emit('join-chat', { roomId: 'main-chat', userId: user.id, username: user.username })

      // Listen for new messages
      socket.on('new-message', (message: Message) => {
        setMessages(prev => [...prev, message])
      })

      // Listen for typing indicators
      socket.on('user-typing', (data: { userId: string; username: string }) => {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username]
          }
          return prev
        })
      })

      socket.on('user-stopped-typing', (data: { userId: string; username: string }) => {
        setTypingUsers(prev => prev.filter(username => username !== data.username))
      })

      return () => {
        socket.off('new-message')
        socket.off('user-typing')
        socket.off('user-stopped-typing')
        socket.emit('leave-chat', { roomId: 'main-chat', userId: user.id })
      }
    }
  }, [socket, user])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return

    const message: Message = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      content: newMessage,
      timestamp: Date.now(),
      type: 'text'
    }

    // Add message locally
    setMessages(prev => [...prev, message])

    // Emit to other users
    if (socket) {
      socket.emit('send-message', {
        roomId: 'main-chat',
        message
      })
    }

    // Clear input
    setNewMessage('')

    // If message mentions AI, get AI response
    if (newMessage.toLowerCase().includes('ai') || newMessage.toLowerCase().includes('assistant')) {
      await getAIResponse(newMessage)
    }
  }

  const getAIResponse = async (userMessage: string) => {
    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            type: 'chat',
            conversation: messages.slice(-5) // Last 5 messages for context
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const aiMessage: Message = {
          id: Date.now().toString(),
          userId: 'ai',
          username: 'AI Assistant',
          content: data.response,
          timestamp: Date.now(),
          type: 'text',
          isAI: true
        }
        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
    }
  }

  const handleTyping = () => {
    if (!isTyping && socket && user) {
      setIsTyping(true)
      socket.emit('typing', {
        roomId: 'main-chat',
        userId: user.id,
        username: user.username
      })

      // Stop typing indicator after 2 seconds
      setTimeout(() => {
        setIsTyping(false)
        if (socket && user) {
          socket.emit('stop-typing', {
            roomId: 'main-chat',
            userId: user.id,
            username: user.username
          })
        }
      }, 2000)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isCodeBlock = (content: string) => {
    return content.includes('```') || content.includes('function') || content.includes('const') || content.includes('let')
  }

  return (
    <div className={`flex flex-col bg-white ${fullScreen ? 'h-full' : 'h-full'}`}>
      {/* Header */}
      <div className="p-4 border-b border-secondary-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-secondary-900">Team Chat</h3>
          <p className="text-sm text-secondary-600">
            {typingUsers.length > 0 ? `${typingUsers.join(', ')} typing...` : 'Real-time collaboration'}
          </p>
        </div>
        <button
          onClick={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
          className="p-2 hover:bg-secondary-100 rounded-lg transition-colors duration-200"
        >
          <MoreVertical size={16} className="text-secondary-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md ${
              message.userId === user?.id ? 'order-2' : 'order-1'
            }`}>
              {message.type === 'system' ? (
                <div className="text-center">
                  <div className="inline-block bg-secondary-100 text-secondary-600 text-xs px-3 py-1 rounded-full">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className={`rounded-lg p-3 ${
                  message.userId === user?.id
                    ? 'chat-message-sent'
                    : message.isAI
                    ? 'bg-primary-50 border border-primary-200 text-primary-900'
                    : 'chat-message-received'
                }`}>
                  {message.userId !== user?.id && (
                    <div className="text-xs font-medium text-secondary-600 mb-1">
                      {message.username}
                    </div>
                  )}
                  
                  <div className="text-sm">
                    {isCodeBlock(message.content) ? (
                      <pre className="bg-secondary-900 text-secondary-100 p-2 rounded text-xs overflow-x-auto">
                        <code>{message.content}</code>
                      </pre>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  
                  <div className={`text-xs mt-1 ${
                    message.userId === user?.id ? 'text-primary-200' : 'text-secondary-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="chat-message-received">
              <div className="text-xs text-secondary-600 mb-1">
                {typingUsers.join(', ')}
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-secondary-200">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Type a message..."
              className="input-field resize-none h-12"
              rows={1}
            />
          </div>
          
          <div className="flex items-center space-x-1">
            <button className="p-2 hover:bg-secondary-100 rounded-lg transition-colors duration-200">
              <Paperclip size={16} className="text-secondary-500" />
            </button>
            <button className="p-2 hover:bg-secondary-100 rounded-lg transition-colors duration-200">
              <Smile size={16} className="text-secondary-500" />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* AI Assistant Panel */}
      {isAIAssistantOpen && (
        <div className="border-t border-secondary-200 p-4 bg-secondary-50">
          <h4 className="font-medium text-secondary-900 mb-2">AI Assistant</h4>
          <div className="space-y-2">
            <button
              onClick={() => setNewMessage('Can you help me optimize this code?')}
              className="w-full text-left p-2 bg-white rounded border border-secondary-200 hover:border-primary-300 text-sm"
            >
              💡 Code optimization
            </button>
            <button
              onClick={() => setNewMessage('What are the best practices for this pattern?')}
              className="w-full text-left p-2 bg-white rounded border border-secondary-200 hover:border-primary-300 text-sm"
            >
              📚 Best practices
            </button>
            <button
              onClick={() => setNewMessage('Can you explain this code?')}
              className="w-full text-left p-2 bg-white rounded border border-secondary-200 hover:border-primary-300 text-sm"
            >
              🤔 Code explanation
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 