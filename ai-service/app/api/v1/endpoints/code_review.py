"""
Code Review API Endpoints
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def code_review_health():
    """Code review health check"""
    return {"status": "code-review-service-ready"} 