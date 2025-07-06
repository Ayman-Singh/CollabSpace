"""
CollabSpace AI Service - Main Application
Production-grade AI/ML microservice for code analysis and assistance
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import structlog
from structlog.stdlib import LoggerFactory

from app.core.config import settings
from app.core.security import get_current_user
from app.api.v1.api import api_router
from app.core.monitoring import setup_monitoring
from app.services.ai_code_completion import AICodeCompletionService
from app.services.ai_code_review import AICodeReviewService
from app.services.ai_documentation import AIDocumentationService
from app.services.ai_search import AISearchService
from app.services.ai_chat import AIChatService
from app.core.database import init_db

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency')

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown"""
    # Startup
    logger.info("Starting CollabSpace AI Service", version=settings.VERSION)
    
    # Initialize database
    await init_db()
    
    # Initialize AI services
    app.state.ai_code_completion = AICodeCompletionService()
    app.state.ai_code_review = AICodeReviewService()
    app.state.ai_documentation = AIDocumentationService()
    app.state.ai_search = AISearchService()
    app.state.ai_chat = AIChatService()
    
    # Setup monitoring
    setup_monitoring()
    
    logger.info("CollabSpace AI Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down CollabSpace AI Service")

def create_application() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title="CollabSpace AI Service",
        description="AI-powered code analysis and assistance microservice",
        version=settings.VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan
    )
    
    # Security middleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include API routes
    app.include_router(api_router, prefix="/api/v1")
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint for load balancers and monitoring"""
        return {
            "status": "healthy",
            "service": "collabspace-ai",
            "version": settings.VERSION,
            "timestamp": asyncio.get_event_loop().time()
        }
    
    # Metrics endpoint for Prometheus
    @app.get("/metrics")
    async def metrics():
        """Prometheus metrics endpoint"""
        return JSONResponse(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST
        )
    
    # Root endpoint
    @app.get("/")
    async def root():
        """Root endpoint with service information"""
        return {
            "service": "CollabSpace AI Service",
            "version": settings.VERSION,
            "description": "AI-powered code analysis and assistance",
            "docs": "/docs" if settings.DEBUG else "Documentation disabled in production",
            "health": "/health",
            "metrics": "/metrics"
        }
    
    return app

# Create application instance
app = create_application()

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "request_id": getattr(request.state, "request_id", "unknown")
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug"
    ) 