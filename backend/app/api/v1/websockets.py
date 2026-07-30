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
