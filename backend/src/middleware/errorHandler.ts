import { Request, Response, NextFunction } from 'express'

interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500
  const message = error.message || 'Internal Server Error'

  // Log error
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${statusCode}: ${message}`)
  
  if (statusCode === 500) {
    console.error('Stack trace:', error.stack)
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  const errorResponse = {
    error: message,
    ...(isDevelopment && { stack: error.stack })
  }

  res.status(statusCode).json(errorResponse)
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  })
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
} 