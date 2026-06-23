from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/chatbot", tags=["chatbot"])
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.services.rag_service import get_answer

class Query(BaseModel):
    question: str
    session_id: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: str

@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_session)):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.updated_at))
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat()
        }
        for s in sessions
    ]

@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_session_messages(session_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_session)):
    # Verify session ownership
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = msg_result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    await db.delete(session)
    await db.commit()
    return {"status": "success"}

@router.post("/ask")
async def ask_chatbot(query: Query, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_session)):
    session_id = query.session_id
    history_dicts = []
    
    if session_id:
        # Verify session
        result = await db.execute(select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id))
        session = result.scalars().first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        # Get history
        msg_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        messages = msg_result.scalars().all()
        history_dicts = [{"role": m.role, "content": m.content} for m in messages]
    else:
        # Create new session
        # Generate title from first 5 words of question
        words = query.question.split()
        title = " ".join(words[:5]) + ("..." if len(words) > 5 else "")
        session = ChatSession(user_id=current_user.id, title=title)
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = session.id
        
    # Save user message
    user_msg = ChatMessage(session_id=session_id, role="user", content=query.question)
    db.add(user_msg)
    await db.commit()

    # Get answer from LLM
    llm_result = await run_in_threadpool(get_answer, query.question, history_dicts)
    answer = llm_result.get("answer", "Error getting answer.")
    
    # Save assistant message
    assistant_msg = ChatMessage(session_id=session_id, role="assistant", content=answer)
    db.add(assistant_msg)
    
    # Update session updated_at
    from datetime import datetime, timezone
    session.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {"session_id": session_id, "answer": answer}
