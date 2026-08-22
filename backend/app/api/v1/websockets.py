from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import json

router = APIRouter(prefix="/ws", tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        # We can store active connections. To be more robust, we might map them by user or organization.
        # For this implementation, a global list of active connections for broadcasting is sufficient.
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Convert dictionary to JSON string
        json_message = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(json_message)
            except Exception as e:
                # Handle cases where the connection might be closed unexpectedly
                print(f"Failed to send message to websocket: {e}")

# Global instance to be used across the application
manager = ConnectionManager()


@router.websocket("/events")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time events.
    Clients connect to /api/v1/ws/events
    """
    await manager.connect(websocket)
    try:
        while True:
            # We don't necessarily expect messages from the client in this flow,
            # but we need to receive to detect disconnects gracefully.
            data = await websocket.receive_text()
            # Can process incoming messages if needed, e.g. ping/pong
    except WebSocketDisconnect:
        manager.disconnect(websocket)

from sqlalchemy.orm import Session
from fastapi import Depends
from app.core.database import get_db
from app.api.deps import get_current_user_ws
from app.models.chat import ChatMessage
from app.schemas.chat import ChatMessageResponse

@router.websocket("/chat")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time global chat.
    Clients connect to /api/v1/ws/chat?token=...
    """
    user = await get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket)
    try:
        while True:
            # Receive text from client
            data = await websocket.receive_text()
            
            try:
                payload = json.loads(data)
                message_text = payload.get("message_text")
                
                if message_text:
                    # Save to DB
                    new_msg = ChatMessage(
                        user_id=user.id,
                        message_text=message_text
                    )
                    db.add(new_msg)
                    db.commit()
                    db.refresh(new_msg)
                    
                    # Create response dict
                    response = {
                        "type": "chat_message",
                        "data": {
                            "id": new_msg.id,
                            "user_id": new_msg.user_id,
                            "message_text": new_msg.message_text,
                            "created_at": new_msg.created_at.isoformat(),
                            "user": {
                                "id": user.id,
                                "first_name": user.first_name,
                                "last_name": user.last_name
                            }
                        }
                    }
                    
                    # Broadcast to all connected clients
                    await manager.broadcast(response)
                    
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
