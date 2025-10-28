from django.conf import settings
from jose import jwt, JWTError
from typing import Optional
from pydantic import BaseModel

# 🚨 기존 security.py 파일에 정의되어 있다고 가정한 상수들
# 실제 환경에 맞게 값을 설정해야 합니다.
SECRET_KEY = settings.SECRET_KEY 
ALGORITHM = settings.ALGORITHM

class TokenData(BaseModel):
    """토큰에 저장된 데이터 구조."""
    email: Optional[str] = None

def decode_token_for_ws(token: str) -> Optional[str]:
    """
    웹소켓 연결을 위한 토큰 디코딩 함수.
    
    HTTPException 대신 None을 반환하여 에러 처리를 웹소켓 로직에서 할 수 있도록 합니다.
    성공적으로 디코딩되면 이메일을 반환합니다.
    """
    try:
        # 1. 토큰 디코딩
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # 2. 이메일 (sub) 추출
        email: str = payload.get("sub")
        
        if email is None:
            return None
            
        # 3. 이메일을 반환하여 사용자를 찾을 수 있도록 함
        return email
        
    except JWTError:
        # 토큰이 유효하지 않거나 만료된 경우
        return None
