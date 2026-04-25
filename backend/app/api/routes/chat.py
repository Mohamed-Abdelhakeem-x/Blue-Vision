"""Chat API routes for streaming bilingual chatbot responses."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import get_settings
from app.services.chatbot_service import ChatbotService


router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    """User chat message."""
    message: str
    scan_context: Optional[dict] = None
    conversation_history: Optional[list[dict]] = None


class GlossaryLookup(BaseModel):
    """Glossary term lookup request."""
    term: str
    language: str = "en"


# Initialize chatbot service (in production, use dependency injection or app state)
_chatbot_service = None
settings = get_settings()


def get_chatbot_service() -> ChatbotService:
    """Get or create chatbot service instance."""
    global _chatbot_service
    if _chatbot_service is None:
        _chatbot_service = ChatbotService(
            model_name=settings.chatbot_model_name,
            base_url=settings.chatbot_base_url,
            auto_pull_model=settings.chatbot_auto_pull_model,
            pull_timeout_seconds=settings.chatbot_pull_timeout_seconds,
        )
    return _chatbot_service


@router.post("/stream")
async def chat_stream(
    request: ChatMessage,
) -> StreamingResponse:
    """Stream a chatbot response.
    
    Returns Server-Sent Events stream with response chunks.
    """
    service = get_chatbot_service()
    
    async def generate():
        """Generator for streaming response."""
        try:
            async for chunk in service.chat_stream(
                message=request.message,
                scan_context=request.scan_context,
                conversation_history=request.conversation_history,
            ):
                if chunk:
                    yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("")
async def chat(
    request: ChatMessage,
) -> dict:
    """Get a complete chatbot response (non-streaming).
    
    Returns:
        JSON with response text
    """
    service = get_chatbot_service()
    
    try:
        response = await service.chat(
            message=request.message,
            scan_context=request.scan_context,
            conversation_history=request.conversation_history,
        )
        return {
            "message": response,
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/glossary")
async def glossary_lookup(
    term: str = Query(..., min_length=1),
    language: str = Query("en", pattern="^(en|ar)$"),
) -> dict:
    """Look up a botanical term in the glossary.
    
    Args:
        term: Term to look up
        language: Response language (en or ar)
        
    Returns:
        Term information or error
    """
    service = get_chatbot_service()
    
    result = service.get_glossary_term(term, language)
    if not result:
        raise HTTPException(status_code=404, detail=f"Term '{term}' not found")
    
    return result
