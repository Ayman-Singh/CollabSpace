import { Request, Response, NextFunction } from 'express'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Started`)
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[36m' : '\x1b[32m'
    
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${statusColor}${status}\x1b[0m - ${duration}ms`
    )
  })
  
  next()
}

export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime()
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start)
    const duration = seconds * 1000 + nanoseconds / 1000000
    
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`)
    }
  })
  
  next()
} 