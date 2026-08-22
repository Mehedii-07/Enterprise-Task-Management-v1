from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserChatInfo(BaseModel):
    id: str
    first_name: str
    last_name: str

class ChatMessageBase(BaseModel):
    message_text: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: int
    user_id: str
    created_at: datetime
    user: Optional[UserChatInfo] = None

    class Config:
        from_attributes = True
