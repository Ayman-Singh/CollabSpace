"""
AI Code Completion Service
Production-grade code completion using OpenAI and custom models
"""

import asyncio
import json
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import openai
import structlog
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

from app.core.config import settings

logger = structlog.get_logger()


@dataclass
class CodeCompletionRequest:
    """Request for code completion"""
    code: str
    language: str
    context: Optional[str] = None
    max_tokens: int = 100
    temperature: float = 0.7
    user_id: Optional[str] = None


@dataclass
class CodeCompletionResponse:
    """Response from code completion service"""
    suggestions: List[str]
    confidence_scores: List[float]
    reasoning: str
    model_used: str
    processing_time: float


class AICodeCompletionService:
    """AI-powered code completion service"""
    
    def __init__(self):
        self.openai_client = None
        self.custom_models = {}
        self.cache = {}
        self._initialize_services()
    
    def _initialize_services(self):
        """Initialize AI services and models"""
        try:
            # Initialize OpenAI client
            if settings.OPENAI_API_KEY:
                self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI client initialized successfully")
            
            # Initialize custom models for different languages
            self._load_custom_models()
            
        except Exception as e:
            logger.error("Failed to initialize AI services", error=str(e))
    
    def _load_custom_models(self):
        """Load custom models for specific languages"""
        try:
            # Load language-specific models
            models_config = {
                "python": "microsoft/DialoGPT-medium",  # Placeholder - would use actual code models
                "javascript": "microsoft/DialoGPT-medium",
                "typescript": "microsoft/DialoGPT-medium",
                "java": "microsoft/DialoGPT-medium",
            }
            
            for language, model_name in models_config.items():
                try:
                    tokenizer = AutoTokenizer.from_pretrained(model_name)
                    model = AutoModelForCausalLM.from_pretrained(model_name)
                    self.custom_models[language] = {
                        "tokenizer": tokenizer,
                        "model": model
                    }
                    logger.info(f"Loaded custom model for {language}")
                except Exception as e:
                    logger.warning(f"Failed to load model for {language}", error=str(e))
                    
        except Exception as e:
            logger.error("Failed to load custom models", error=str(e))
    
    async def get_completion(self, request: CodeCompletionRequest) -> CodeCompletionResponse:
        """Get code completion suggestions"""
        start_time = time.time()
        
        try:
            # Check cache first
            cache_key = self._generate_cache_key(request)
            if cache_key in self.cache:
                cached_result = self.cache[cache_key]
                logger.info("Returning cached completion result")
                return cached_result
            
            # Get suggestions from multiple sources
            suggestions = []
            confidence_scores = []
            model_used = "openai"
            
            # Try OpenAI first
            if self.openai_client:
                openai_suggestions = await self._get_openai_completion(request)
                suggestions.extend(openai_suggestions)
                confidence_scores.extend([0.9] * len(openai_suggestions))
            
            # Try custom models
            if request.language in self.custom_models:
                custom_suggestions = await self._get_custom_model_completion(request)
                suggestions.extend(custom_suggestions)
                confidence_scores.extend([0.7] * len(custom_suggestions))
                model_used = "custom"
            
            # Fallback to rule-based suggestions
            if not suggestions:
                fallback_suggestions = self._get_fallback_suggestions(request)
                suggestions.extend(fallback_suggestions)
                confidence_scores.extend([0.5] * len(fallback_suggestions))
                model_used = "rule-based"
            
            processing_time = time.time() - start_time
            
            response = CodeCompletionResponse(
                suggestions=suggestions[:5],  # Limit to top 5 suggestions
                confidence_scores=confidence_scores[:5],
                reasoning=self._generate_reasoning(request, suggestions),
                model_used=model_used,
                processing_time=processing_time
            )
            
            # Cache the result
            self.cache[cache_key] = response
            
            logger.info(
                "Code completion completed",
                language=request.language,
                suggestions_count=len(suggestions),
                processing_time=processing_time,
                model_used=model_used
            )
            
            return response
            
        except Exception as e:
            logger.error("Code completion failed", error=str(e), language=request.language)
            raise
    
    async def _get_openai_completion(self, request: CodeCompletionRequest) -> List[str]:
        """Get completion suggestions from OpenAI"""
        try:
            # Create context-aware prompt
            prompt = self._create_openai_prompt(request)
            
            response = await self.openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert code completion assistant. Provide only code suggestions without explanations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                n=3  # Generate 3 suggestions
            )
            
            suggestions = []
            for choice in response.choices:
                suggestion = choice.message.content.strip()
                if suggestion:
                    suggestions.append(suggestion)
            
            return suggestions
            
        except Exception as e:
            logger.error("OpenAI completion failed", error=str(e))
            return []
    
    async def _get_custom_model_completion(self, request: CodeCompletionRequest) -> List[str]:
        """Get completion suggestions from custom models"""
        try:
            if request.language not in self.custom_models:
                return []
            
            model_info = self.custom_models[request.language]
            tokenizer = model_info["tokenizer"]
            model = model_info["model"]
            
            # Tokenize input
            inputs = tokenizer.encode(request.code, return_tensors="pt", truncation=True, max_length=512)
            
            # Generate completion
            with torch.no_grad():
                outputs = model.generate(
                    inputs,
                    max_length=inputs.shape[1] + request.max_tokens,
                    num_return_sequences=3,
                    temperature=request.temperature,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id
                )
            
            suggestions = []
            for output in outputs:
                # Decode only the new tokens
                new_tokens = output[inputs.shape[1]:]
                suggestion = tokenizer.decode(new_tokens, skip_special_tokens=True)
                if suggestion.strip():
                    suggestions.append(suggestion.strip())
            
            return suggestions
            
        except Exception as e:
            logger.error("Custom model completion failed", error=str(e))
            return []
    
    def _get_fallback_suggestions(self, request: CodeCompletionRequest) -> List[str]:
        """Get fallback suggestions based on language patterns"""
        language_patterns = {
            "python": [
                "def ",
                "class ",
                "import ",
                "from ",
                "if __name__ == '__main__':",
                "try:",
                "except ",
                "finally:",
                "with ",
                "async def ",
                "await ",
                "return ",
                "yield ",
                "raise ",
                "assert ",
                "print(",
                "len(",
                "str(",
                "int(",
                "list(",
                "dict(",
                "set(",
                "tuple(",
            ],
            "javascript": [
                "function ",
                "const ",
                "let ",
                "var ",
                "if (",
                "for (",
                "while (",
                "try {",
                "catch (",
                "finally {",
                "async function ",
                "await ",
                "return ",
                "throw ",
                "console.log(",
                "console.error(",
                "console.warn(",
                "Array(",
                "Object(",
                "String(",
                "Number(",
                "Boolean(",
                "Date(",
                "Math.",
                "JSON.",
            ],
            "typescript": [
                "function ",
                "const ",
                "let ",
                "var ",
                "interface ",
                "type ",
                "enum ",
                "class ",
                "async function ",
                "await ",
                "return ",
                "throw ",
                "console.log(",
                "Array<",
                "Promise<",
                "Map<",
                "Set<",
                "Record<",
                "Partial<",
                "Required<",
                "Pick<",
                "Omit<",
            ],
            "java": [
                "public class ",
                "public static void main(",
                "public void ",
                "private ",
                "protected ",
                "static ",
                "final ",
                "abstract ",
                "interface ",
                "enum ",
                "try {",
                "catch (",
                "finally {",
                "if (",
                "for (",
                "while (",
                "return ",
                "throw ",
                "System.out.println(",
                "System.out.print(",
                "new ",
                "super(",
                "this.",
            ]
        }
        
        patterns = language_patterns.get(request.language, [])
        suggestions = []
        
        # Analyze current code context
        lines = request.code.split('\n')
        last_line = lines[-1] if lines else ""
        
        # Find relevant patterns based on context
        for pattern in patterns:
            if pattern.lower() not in last_line.lower():
                suggestions.append(pattern)
        
        return suggestions[:5]
    
    def _create_openai_prompt(self, request: CodeCompletionRequest) -> str:
        """Create context-aware prompt for OpenAI"""
        language = request.language
        code = request.code
        context = request.context or ""
        
        prompt = f"""Complete the following {language} code. Provide only the code completion without explanations.

Context: {context}

Code:
{code}

Complete the code:"""
        
        return prompt
    
    def _generate_reasoning(self, request: CodeCompletionRequest, suggestions: List[str]) -> str:
        """Generate reasoning for the suggestions"""
        if not suggestions:
            return "No suggestions available"
        
        reasoning = f"Generated {len(suggestions)} suggestions for {request.language} code based on "
        
        if request.context:
            reasoning += f"context '{request.context}' and "
        
        reasoning += f"current code structure. Top suggestions focus on common patterns and best practices for {request.language}."
        
        return reasoning
    
    def _generate_cache_key(self, request: CodeCompletionRequest) -> str:
        """Generate cache key for the request"""
        import hashlib
        
        content = f"{request.code}:{request.language}:{request.max_tokens}:{request.temperature}"
        if request.context:
            content += f":{request.context}"
        
        return hashlib.md5(content.encode()).hexdigest()
    
    async def get_completion_metrics(self) -> Dict[str, Any]:
        """Get metrics about code completion service"""
        return {
            "total_requests": len(self.cache),
            "models_loaded": list(self.custom_models.keys()),
            "openai_available": self.openai_client is not None,
            "cache_size": len(self.cache),
            "supported_languages": list(self.custom_models.keys()) + ["openai"]
        } 