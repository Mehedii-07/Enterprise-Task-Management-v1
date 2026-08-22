from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.chat import ChatMessage
from app.schemas.chat import ChatMessageResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.get("/messages", response_model=List[ChatMessageResponse])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
):
    """
    Get global chat history (last 'limit' messages)
    """
    from sqlalchemy.orm import joinedload
    messages = (
        db.query(ChatMessage)
        .options(joinedload(ChatMessage.user))
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    
    # Reverse to send them in chronological order
    return messages[::-1]
