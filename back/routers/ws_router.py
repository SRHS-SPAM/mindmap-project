from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, status
from typing import Optional
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
# 🚨 앞서 정의한 ConnectionManager와 토큰 유틸리티 임포트
from .realtime import manager
from .security_utils import decode_token_for_ws # 🚨 security_utils.py 사용 가정

router = APIRouter()

# 의존성 주입: 토큰을 사용하여 DB에서 사용자 객체를 가져옵니다.
async def get_user_from_token(token: str, db: Session = Depends(get_db)) -> Optional[User]:
    """
    웹소켓 쿼리 파라미터로 받은 토큰을 검증하고 사용자 객체를 반환합니다.
    """
    email = decode_token_for_ws(token)
    if email is None:
        return None
    
    # DB에서 사용자를 찾아 반환
    user = db.query(User).filter(User.email == email).first()
    return user


@router.websocket("/ws/status")
async def websocket_status_endpoint(
    websocket: WebSocket, 
    token: str = Query(..., description="JWT access token for authentication"),
    db_user: User = Depends(get_user_from_token) # 토큰을 검증하여 사용자 객체를 주입
):
    # 1. 사용자 인증 및 유효성 검사
    if db_user is None:
        # 인증 실패 시 연결 거부
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_email = db_user.email
    
    # 2. 연결 및 상태 브로드캐스트
    await manager.connect(websocket, user_email)
    
    # 로그인 상태 브로드캐스트 (모든 클라이언트에게 이 사용자가 온라인이 되었음을 알림)
    online_message = {
        "type": "status_update",
        "user_email": user_email,
        "is_online": True,
        "friend_code": db_user.friend_code # 친구 코드를 함께 전송하여 프론트엔드에서 매칭
    }
    # 브로드캐스트 시 자기 자신(user_email)은 제외 (자기 탭에는 이미 연결되었으므로)
    await manager.broadcast(online_message, exclude_email=user_email)

    try:
        # 3. 연결 유지: 클라이언트로부터의 메시지를 기다림 (실제로는 비어 있을 수 있음)
        while True:
            # 이 라인을 실행하여 웹소켓 연결을 유지하고, 클라이언트의 종료 메시지를 대기합니다.
            await websocket.receive_text() 
            
    except WebSocketDisconnect:
        # 4. 연결 끊김 (로그아웃 또는 탭 종료) 처리
        manager.disconnect(user_email)
        
        # 오프라인 상태 브로드캐스트
        offline_message = {
            "type": "status_update",
            "user_email": user_email,
            "is_online": False,
            "friend_code": db_user.friend_code
        }
        await manager.broadcast(offline_message)
        
    except Exception as e:
        # 기타 예외 처리 (예: DB 오류 등)
        print(f"WebSocket error for {user_email}: {e}")
        manager.disconnect(user_email)
        
        # 오프라인 상태 브로드캐스트
        offline_message = {
            "type": "status_update",
            "user_email": user_email,
            "is_online": False,
            "friend_code": db_user.friend_code
        }
        await manager.broadcast(offline_message)
