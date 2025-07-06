"""
Code Completion API Endpoints
Production-grade endpoints for AI-powered code completion
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from pydantic import BaseModel, Field
import structlog

from app.core.security import get_current_user, rate_limit, validate_input_sanitization
from app.services.ai_code_completion import AICodeCompletionService, CodeCompletionRequest, CodeCompletionResponse

logger = structlog.get_logger()
router = APIRouter()


class CodeCompletionRequestModel(BaseModel):
    """Request model for code completion"""
    code: str = Field(..., description="Code to complete", min_length=1, max_length=10000)
    language: str = Field(..., description="Programming language", regex="^(python|javascript|typescript|java|cpp|csharp|go|rust)$")
    context: Optional[str] = Field(None, description="Additional context for completion")
    max_tokens: int = Field(100, description="Maximum tokens to generate", ge=1, le=500)
    temperature: float = Field(0.7, description="Creativity level", ge=0.0, le=1.0)
    
    class Config:
        schema_extra = {
            "example": {
                "code": "def calculate_fibonacci(n):\n    if n <= 1:\n        return n\n    ",
                "language": "python",
                "context": "Calculate fibonacci numbers efficiently",
                "max_tokens": 50,
                "temperature": 0.7
            }
        }


class CodeCompletionResponseModel(BaseModel):
    """Response model for code completion"""
    suggestions: List[str] = Field(..., description="Code completion suggestions")
    confidence_scores: List[float] = Field(..., description="Confidence scores for suggestions")
    reasoning: str = Field(..., description="Explanation of suggestions")
    model_used: str = Field(..., description="AI model used for completion")
    processing_time: float = Field(..., description="Processing time in seconds")
    
    class Config:
        schema_extra = {
            "example": {
                "suggestions": [
                    "return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)",
                    "return n if n <= 1 else calculate_fibonacci(n-1) + calculate_fibonacci(n-2)"
                ],
                "confidence_scores": [0.95, 0.87],
                "reasoning": "Generated suggestions based on recursive fibonacci pattern",
                "model_used": "openai",
                "processing_time": 0.234
            }
        }


@router.post("/complete", response_model=CodeCompletionResponseModel)
@rate_limit(limit=50, window=60)  # 50 requests per minute
async def complete_code(
    request: CodeCompletionRequestModel,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    ai_service: AICodeCompletionService = Depends()
) -> CodeCompletionResponseModel:
    """
    Get AI-powered code completion suggestions
    
    - **code**: The code to complete
    - **language**: Programming language
    - **context**: Additional context (optional)
    - **max_tokens**: Maximum tokens to generate
    - **temperature**: Creativity level (0.0-1.0)
    """
    try:
        # Validate and sanitize input
        sanitized_code = validate_input_sanitization(request.code)
        sanitized_context = validate_input_sanitization(request.context) if request.context else None
        
        # Create service request
        service_request = CodeCompletionRequest(
            code=sanitized_code,
            language=request.language,
            context=sanitized_context,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            user_id=current_user.get("sub")
        )
        
        # Get completion suggestions
        response = await ai_service.get_completion(service_request)
        
        # Log usage for analytics
        background_tasks.add_task(
            _log_completion_usage,
            user_id=current_user.get("sub"),
            language=request.language,
            model_used=response.model_used,
            processing_time=response.processing_time
        )
        
        logger.info(
            "Code completion request processed",
            user_id=current_user.get("sub"),
            language=request.language,
            suggestions_count=len(response.suggestions),
            processing_time=response.processing_time
        )
        
        return CodeCompletionResponseModel(
            suggestions=response.suggestions,
            confidence_scores=response.confidence_scores,
            reasoning=response.reasoning,
            model_used=response.model_used,
            processing_time=response.processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Code completion failed",
            error=str(e),
            user_id=current_user.get("sub"),
            language=request.language
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to generate code completion suggestions"
        )


@router.get("/languages")
async def get_supported_languages() -> dict:
    """Get list of supported programming languages"""
    from app.core.config import settings
    
    return {
        "languages": settings.SUPPORTED_LANGUAGES,
        "total": len(settings.SUPPORTED_LANGUAGES)
    }


@router.get("/metrics")
async def get_completion_metrics(
    current_user: dict = Depends(get_current_user),
    ai_service: AICodeCompletionService = Depends()
) -> dict:
    """Get metrics about the code completion service"""
    try:
        metrics = await ai_service.get_completion_metrics()
        return {
            "service": "code-completion",
            "metrics": metrics,
            "timestamp": "2024-01-01T00:00:00Z"  # Would use actual timestamp
        }
    except Exception as e:
        logger.error("Failed to get completion metrics", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve service metrics"
        )


async def _log_completion_usage(
    user_id: str,
    language: str,
    model_used: str,
    processing_time: float
):
    """Log completion usage for analytics (background task)"""
    try:
        # In production, this would send to analytics service
        logger.info(
            "Code completion usage logged",
            user_id=user_id,
            language=language,
            model_used=model_used,
            processing_time=processing_time
        )
    except Exception as e:
        logger.error("Failed to log completion usage", error=str(e)) 