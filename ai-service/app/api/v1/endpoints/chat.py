"""
AI Chat API Endpoints
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def chat_health():
    """Chat service health check"""
    return {"status": "chat-service-ready"} 