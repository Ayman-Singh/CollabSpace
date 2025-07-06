"""
Search API Endpoints
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def search_health():
    """Search service health check"""
    return {"status": "search-service-ready"} 