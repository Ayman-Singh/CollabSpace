import { Server, Socket } from 'socket.io'
import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

interface AuthenticatedSocket extends Socket {
  userId?: string
  username?: string
}

export const setupSocketHandlers = (io: Server, redis: Redis, prisma: PrismaClient) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]
      
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const secret = process.env.JWT_SECRET
      if (!secret) {
        throw new Error('JWT_SECRET not configured')
      }

      const decoded = jwt.verify(token, secret) as any
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, isActive: true }
      })

      if (!user || !user.isActive) {
        return next(new Error('Invalid or inactive user'))
      }

      socket.userId = user.id
      socket.username = user.username
      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`)

    // Join room
    socket.on('join-room', async (data: { roomId: string; userId: string; username: string }) => {
      try {
        await socket.join(data.roomId)
        
        // Store user in Redis for room tracking
        await redis.sadd(`room:${data.roomId}:users`, JSON.stringify({
          userId: data.userId,
          username: data.username,
          socketId: socket.id
        }))

        // Notify others in room
        socket.to(data.roomId).emit('user-joined', {
          userId: data.userId,
          username: data.username
        })

        console.log(`${data.username} joined room: ${data.roomId}`)
      } catch (error) {
        console.error('Error joining room:', error)
      }
    })

    // Leave room
    socket.on('leave-room', async (data: { roomId: string; userId: string }) => {
      try {
        await socket.leave(data.roomId)
        
        // Remove user from Redis
        await redis.srem(`room:${data.roomId}:users`, JSON.stringify({
          userId: data.userId,
          username: socket.username,
          socketId: socket.id
        }))

        // Notify others in room
        socket.to(data.roomId).emit('user-left', {
          userId: data.userId,
          username: socket.username
        })

        console.log(`${socket.username} left room: ${data.roomId}`)
      } catch (error) {
        console.error('Error leaving room:', error)
      }
    })

    // Code editing events
    socket.on('code-change', async (data: {
      roomId: string
      userId: string
      username: string
      text: string
      timestamp: number
    }) => {
      try {
        // Broadcast to other users in room
        socket.to(data.roomId).emit('code-change', {
          userId: data.userId,
          username: data.username,
          text: data.text,
          timestamp: data.timestamp
        })

        // Store in Redis for persistence
        await redis.setex(
          `code:${data.roomId}`,
          3600, // 1 hour
          JSON.stringify({
            text: data.text,
            lastModified: data.timestamp,
            lastModifiedBy: data.username
          })
        )
      } catch (error) {
        console.error('Error handling code change:', error)
      }
    })

    // Cursor movement
    socket.on('cursor-move', (data: {
      roomId: string
      userId: string
      username: string
      position: { line: number; column: number }
    }) => {
      socket.to(data.roomId).emit('cursor-move', {
        userId: data.userId,
        username: data.username,
        position: data.position
      })
    })

    // Chat events
    socket.on('join-chat', async (data: { roomId: string; userId: string; username: string }) => {
      try {
        await socket.join(`chat:${data.roomId}`)
        
        // Store chat user in Redis
        await redis.sadd(`chat:${data.roomId}:users`, JSON.stringify({
          userId: data.userId,
          username: data.username,
          socketId: socket.id
        }))

        console.log(`${data.username} joined chat: ${data.roomId}`)
      } catch (error) {
        console.error('Error joining chat:', error)
      }
    })

    socket.on('leave-chat', async (data: { roomId: string; userId: string }) => {
      try {
        await socket.leave(`chat:${data.roomId}`)
        
        // Remove from Redis
        await redis.srem(`chat:${data.roomId}:users`, JSON.stringify({
          userId: data.userId,
          username: socket.username,
          socketId: socket.id
        }))

        console.log(`${socket.username} left chat: ${data.roomId}`)
      } catch (error) {
        console.error('Error leaving chat:', error)
      }
    })

    socket.on('send-message', async (data: { roomId: string; message: any }) => {
      try {
        // Broadcast to chat room
        io.to(`chat:${data.roomId}`).emit('new-message', data.message)

        // Store message in database
        await prisma.message.create({
          data: {
            content: data.message.content,
            type: data.message.type,
            userId: data.message.userId,
            roomId: data.roomId,
            timestamp: new Date(data.message.timestamp)
          }
        })
      } catch (error) {
        console.error('Error sending message:', error)
      }
    })

    socket.on('typing', (data: { roomId: string; userId: string; username: string }) => {
      socket.to(`chat:${data.roomId}`).emit('user-typing', {
        userId: data.userId,
        username: data.username
      })
    })

    socket.on('stop-typing', (data: { roomId: string; userId: string; username: string }) => {
      socket.to(`chat:${data.roomId}`).emit('user-stopped-typing', {
        userId: data.userId,
        username: data.username
      })
    })

    // Video call events
    socket.on('join-video-room', async (data: { roomId: string; userId: string; username: string }) => {
      try {
        await socket.join(`video:${data.roomId}`)
        
        // Store video user in Redis
        await redis.sadd(`video:${data.roomId}:users`, JSON.stringify({
          userId: data.userId,
          username: data.username,
          socketId: socket.id
        }))

        // Notify others
        socket.to(`video:${data.roomId}`).emit('participant-joined', {
          id: data.userId,
          username: data.username,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false
        })

        console.log(`${data.username} joined video room: ${data.roomId}`)
      } catch (error) {
        console.error('Error joining video room:', error)
      }
    })

    socket.on('leave-video-room', async (data: { roomId: string; userId: string }) => {
      try {
        await socket.leave(`video:${data.roomId}`)
        
        // Remove from Redis
        await redis.srem(`video:${data.roomId}:users`, JSON.stringify({
          userId: data.userId,
          username: socket.username,
          socketId: socket.id
        }))

        // Notify others
        socket.to(`video:${data.roomId}`).emit('participant-left', data.userId)

        console.log(`${socket.username} left video room: ${data.roomId}`)
      } catch (error) {
        console.error('Error leaving video room:', error)
      }
    })

    socket.on('toggle-mute', (data: { roomId: string; userId: string; isMuted: boolean }) => {
      socket.to(`video:${data.roomId}`).emit('participant-muted', {
        userId: data.userId,
        isMuted: data.isMuted
      })
    })

    socket.on('toggle-video', (data: { roomId: string; userId: string; isVideoOff: boolean }) => {
      socket.to(`video:${data.roomId}`).emit('participant-video-off', {
        userId: data.userId,
        isVideoOff: data.isVideoOff
      })
    })

    socket.on('screen-share-started', (data: { roomId: string; userId: string }) => {
      socket.to(`video:${data.roomId}`).emit('screen-share-started', {
        userId: data.userId,
        username: socket.username
      })
    })

    socket.on('screen-share-stopped', (data: { roomId: string; userId: string }) => {
      socket.to(`video:${data.roomId}`).emit('screen-share-stopped', {
        userId: data.userId,
        username: socket.username
      })
    })

    // WebRTC signaling
    socket.on('offer', (data: { roomId: string; offer: any; targetUserId: string }) => {
      socket.to(`video:${data.roomId}`).emit('offer', {
        offer: data.offer,
        fromUserId: socket.userId,
        fromUsername: socket.username
      })
    })

    socket.on('answer', (data: { roomId: string; answer: any; targetUserId: string }) => {
      socket.to(`video:${data.roomId}`).emit('answer', {
        answer: data.answer,
        fromUserId: socket.userId,
        fromUsername: socket.username
      })
    })

    socket.on('ice-candidate', (data: { roomId: string; candidate: any; targetUserId: string }) => {
      socket.to(`video:${data.roomId}`).emit('ice-candidate', {
        candidate: data.candidate,
        fromUserId: socket.userId,
        fromUsername: socket.username
      })
    })

    // Disconnect handling
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username} (${socket.userId})`)
      
      try {
        // Clean up Redis entries
        const rooms = await redis.keys(`*:users`)
        for (const room of rooms) {
          await redis.srem(room, JSON.stringify({
            userId: socket.userId,
            username: socket.username,
            socketId: socket.id
          }))
        }
      } catch (error) {
        console.error('Error cleaning up on disconnect:', error)
      }
    })
  })

  // Error handling
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err)
  })
} 