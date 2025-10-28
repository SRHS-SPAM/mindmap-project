from fastapi import WebSocket
from typing import Dict, List, Optional
import json

class ConnectionManager:
    """
    활성 웹소켓 연결을 관리하는 클래스.
    {user_email: WebSocket} 형태로 저장됩니다.
    """
    def __init__(self):
        # 활성 연결을 저장하는 딕셔너리
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_email: str):
        """새로운 웹소켓 연결을 수락하고 활성 연결에 추가합니다."""
        await websocket.accept()
        self.active_connections[user_email] = websocket

    def disconnect(self, user_email: str):
        """연결이 끊어진 사용자를 목록에서 제거합니다."""
        if user_email in self.active_connections:
            del self.active_connections[user_email]

    async def send_personal_message(self, message: str, user_email: str):
        """특정 사용자에게 메시지를 전송합니다."""
        if user_email in self.active_connections:
            await self.active_connections[user_email].send_text(message)

    async def broadcast(self, message: dict, exclude_email: Optional[str] = None):
        """
        모든 활성 연결된 클라이언트에게 JSON 메시지를 브로드캐스트합니다.
        
        Args:
            message (dict): 브로드캐스트할 데이터 (JSON 직렬화됨)
            exclude_email (str): 메시지 수신에서 제외할 사용자 (선택 사항)
        """
        json_message = json.dumps(message)
        
        # 모든 활성 연결에 비동기적으로 메시지 전송
        for email, connection in self.active_connections.items():
            if email != exclude_email:
                try:
                    await connection.send_text(json_message)
                except RuntimeError as e:
                    # 연결이 이미 닫혔거나 오류가 발생한 경우 처리
                    print(f"Error broadcasting to {email}: {e}")
                    self.disconnect(email)


manager = ConnectionManager()
