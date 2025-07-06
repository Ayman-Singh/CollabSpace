'use client'

import { useState, useEffect, useRef } from 'react'
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Share, Monitor, Settings, Users } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { useAuth } from '@/hooks/useAuth'

interface Participant {
  id: string
  username: string
  stream?: MediaStream
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
}

export function VideoCall() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const { socket } = useSocket()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Initialize local participant
      setParticipants([{
        id: user.id,
        username: user.username,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false
      }])
    }
  }, [user])

  useEffect(() => {
    if (socket && user) {
      // Join video room
      socket.emit('join-video-room', { roomId: 'main-video', userId: user.id, username: user.username })

      // Listen for participant events
      socket.on('participant-joined', (participant: Participant) => {
        setParticipants(prev => [...prev, participant])
      })

      socket.on('participant-left', (participantId: string) => {
        setParticipants(prev => prev.filter(p => p.id !== participantId))
      })

      socket.on('participant-muted', (data: { userId: string; isMuted: boolean }) => {
        setParticipants(prev => prev.map(p => 
          p.id === data.userId ? { ...p, isMuted: data.isMuted } : p
        ))
      })

      socket.on('participant-video-off', (data: { userId: string; isVideoOff: boolean }) => {
        setParticipants(prev => prev.map(p => 
          p.id === data.userId ? { ...p, isVideoOff: data.isVideoOff } : p
        ))
      })

      return () => {
        socket.off('participant-joined')
        socket.off('participant-left')
        socket.off('participant-muted')
        socket.off('participant-video-off')
        socket.emit('leave-video-room', { roomId: 'main-video', userId: user.id })
      }
    }
  }, [socket, user])

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      
      setIsInCall(true)
      
      // Notify other participants
      if (socket) {
        socket.emit('start-call', { roomId: 'main-video', userId: user?.id })
      }
    } catch (error) {
      console.error('Error accessing media devices:', error)
    }
  }

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    
    setIsInCall(false)
    setIsScreenSharing(false)
    
    if (socket) {
      socket.emit('end-call', { roomId: 'main-video', userId: user?.id })
    }
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
        
        if (socket) {
          socket.emit('toggle-mute', { 
            roomId: 'main-video', 
            userId: user?.id, 
            isMuted: !audioTrack.enabled 
          })
        }
      }
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
        
        if (socket) {
          socket.emit('toggle-video', { 
            roomId: 'main-video', 
            userId: user?.id, 
            isVideoOff: !videoTrack.enabled 
          })
        }
      }
    }
  }

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        })
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }
        
        setIsScreenSharing(true)
        
        if (socket) {
          socket.emit('screen-share-started', { 
            roomId: 'main-video', 
            userId: user?.id 
          })
        }
      } else {
        if (localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream
        }
        
        setIsScreenSharing(false)
        
        if (socket) {
          socket.emit('screen-share-stopped', { 
            roomId: 'main-video', 
            userId: user?.id 
          })
        }
      }
    } catch (error) {
      console.error('Error sharing screen:', error)
    }
  }

  return (
    <div className="h-full flex flex-col bg-secondary-900">
      {/* Header */}
      <div className="p-4 bg-white border-b border-secondary-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900">Video Call</h2>
          <p className="text-sm text-secondary-600">
            {participants.length} participant{participants.length !== 1 ? 's' : ''} in call
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors duration-200"
          >
            <Users size={16} className="text-secondary-500" />
          </button>
          <button className="p-2 hover:bg-secondary-100 rounded-lg transition-colors duration-200">
            <Settings size={16} className="text-secondary-500" />
          </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {!isInCall ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-secondary-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video size={32} className="text-secondary-500" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Start Video Call
              </h3>
              <p className="text-secondary-600 mb-6">
                Connect with your team members for face-to-face collaboration
              </p>
              <button
                onClick={startCall}
                className="btn-primary"
              >
                Start Call
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full relative">
            {/* Main Video */}
            <div className="h-full flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover rounded-lg"
              />
            </div>

            {/* Remote Video (if available) */}
            {participants.length > 1 && (
              <div className="absolute top-4 right-4 w-64 h-48">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-lg border-2 border-white shadow-lg"
                />
              </div>
            )}

            {/* Participants List */}
            {showParticipants && (
              <div className="absolute top-4 left-4 w-64 bg-white rounded-lg shadow-strong border border-secondary-200">
                <div className="p-3 border-b border-secondary-200">
                  <h4 className="font-medium text-secondary-900">Participants</h4>
                </div>
                <div className="p-3 max-h-64 overflow-y-auto">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-2 py-2">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {participant.username.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-secondary-900">
                          {participant.username}
                        </div>
                        <div className="flex items-center space-x-1">
                          {participant.isMuted && <MicOff size={12} className="text-error-500" />}
                          {participant.isVideoOff && <VideoOff size={12} className="text-error-500" />}
                          {participant.isScreenSharing && <Monitor size={12} className="text-primary-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      {isInCall && (
        <div className="p-4 bg-white border-t border-secondary-200">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors duration-200 ${
                isMuted ? 'bg-error-500 text-white' : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors duration-200 ${
                isVideoOff ? 'bg-error-500 text-white' : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
            >
              {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-full transition-colors duration-200 ${
                isScreenSharing ? 'bg-primary-500 text-white' : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
            >
              <Share size={20} />
            </button>

            <button
              onClick={endCall}
              className="p-3 bg-error-500 text-white rounded-full hover:bg-error-600 transition-colors duration-200"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 