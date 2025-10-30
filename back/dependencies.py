from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated

# security.py에서 정의된 유틸리티와 스키마를 임포트합니다.
from .security import oauth2_scheme, verify_token, credentials_exception 
# DB 및 모델 관련 임포트
from .database import get_db 
from .models import User 
# TokenData는 verify_token의 반환 타입으로 사용되므로, 직접 임포트할 필요는 없습니다.


# ----------------- 핵심 의존성 함수 -----------------

def get_current_user(
    # security.py의 oauth2_scheme를 사용하여 HTTP 헤더에서 토큰을 추출합니다.
    token: Annotated[str, Depends(oauth2_scheme)],
    # database.py의 get_db를 사용하여 DB 세션을 주입받습니다.
    db: Session = Depends(get_db)
) -> User:
    """
    유효한 JWT 토큰을 검증하고, 토큰의 이메일(sub)을 기준으로 DB에서 User 객체를 조회하여 반환합니다.
    """
    
    # 1. security.py의 verify_token을 사용하여 토큰을 디코드하고 TokenData를 얻습니다.
    # verify_token 함수 내부에서 인증 실패 시 예외가 발생합니다.
    token_data = verify_token(token)
    
    # 2. 데이터베이스에서 이메일을 기반으로 사용자 정보를 조회합니다.
    # 토큰에 이메일(sub)이 포함되어 있음을 신뢰하고 조회합니다.
    user = db.query(User).filter(User.email == token_data.email).first()
    
    # 3. 사용자 객체가 DB에 없으면 인증 예외 발생
    if user is None:
        raise credentials_exception
    
    # 4. 모든 검증을 통과한 사용자 객체 반환
    return user


def get_current_active_user(
    # get_current_user 의존성 함수를 사용하여 User 객체를 주입받습니다.
    current_user: User = Depends(get_current_user)
) -> User:
    """
    활성화된 현재 사용자 객체를 반환하는 의존성 주입 함수입니다.
    (사용자 활성화/비활성화 상태를 확인하는 로직이 필요한 경우 여기에 추가합니다.)
    """
    # 🚨 필요하다면, 여기에 User 모델의 'is_active' 필드를 확인하는 로직을 추가합니다.
    # if not current_user.is_active:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST, 
    #         detail="Inactive user. Please activate your account."
    #     )
        
    return current_user
