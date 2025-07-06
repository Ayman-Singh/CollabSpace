"""
Main API router for CollabSpace AI Service
Organizes all API endpoints with proper versioning
"""

from fastapi import APIRouter

from app.api.v1.endpoints import code_completion, code_review, documentation, search, chat, health

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    code_completion.router,
    prefix="/code-completion",
    tags=["Code Completion"]
)

api_router.include_router(
    code_review.router,
    prefix="/code-review",
    tags=["Code Review"]
)

api_router.include_router(
    documentation.router,
    prefix="/documentation",
    tags=["Documentation"]
)

api_router.include_router(
    search.router,
    prefix="/search",
    tags=["Search"]
)

api_router.include_router(
    chat.router,
    prefix="/chat",
    tags=["AI Chat"]
)

api_router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"]
) 