"""
Configuration settings for CollabSpace AI Service
Production-grade configuration management with environment-based settings
"""

import os
from typing import List, Optional
from pydantic import BaseSettings, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment-based configuration"""
    
    # Application
    APP_NAME: str = "CollabSpace AI Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/collabspace_ai"
    REDIS_URL: str = "redis://localhost:6379"
    
    # AI/ML Services
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_MAX_TOKENS: int = 2048
    OPENAI_TEMPERATURE: float = 0.7
    
    # HuggingFace
    HUGGINGFACE_API_KEY: Optional[str] = None
    HUGGINGFACE_MODEL: str = "microsoft/DialoGPT-medium"
    
    # Vector Database
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"
    
    # Monitoring
    PROMETHEUS_ENABLED: bool = True
    LOG_LEVEL: str = "INFO"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # Code Analysis
    MAX_CODE_LENGTH: int = 10000
    SUPPORTED_LANGUAGES: List[str] = [
        "python", "javascript", "typescript", "java", "cpp", "csharp", "go", "rust"
    ]
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES: List[str] = [".py", ".js", ".ts", ".java", ".cpp", ".cs", ".go", ".rs"]
    
    # Cache
    CACHE_TTL: int = 3600  # 1 hour
    CACHE_MAX_SIZE: int = 1000
    
    # Background Tasks
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # External Services
    BACKEND_API_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # AWS (for production)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: Optional[str] = None
    
    @validator("SECRET_KEY")
    def validate_secret_key(cls, v):
        if v == "your-secret-key-change-in-production":
            raise ValueError("SECRET_KEY must be set in production")
        return v
    
    @validator("OPENAI_API_KEY")
    def validate_openai_key(cls, v):
        if not v and not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY must be set for AI features")
        return v or os.getenv("OPENAI_API_KEY")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()

# Environment-specific overrides
if os.getenv("ENVIRONMENT") == "production":
    settings.DEBUG = False
    settings.LOG_LEVEL = "WARNING"
    settings.ALLOWED_HOSTS = ["*.yourdomain.com", "yourdomain.com"]
elif os.getenv("ENVIRONMENT") == "staging":
    settings.DEBUG = False
    settings.LOG_LEVEL = "INFO"
elif os.getenv("ENVIRONMENT") == "development":
    settings.DEBUG = True
    settings.LOG_LEVEL = "DEBUG" 