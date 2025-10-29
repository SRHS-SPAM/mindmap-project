from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# 🚨 DB 및 모델 관련 임포트는 이 파일에서 제거됩니다.
# from sqlalchemy.orm import Session
# from .database import get_db 
# from .models import User 

from .schemas import TokenData 
from .config import get_settings, Settings 

# 애플리케이션 설정을 로드합니다. (캐시된 단일 인스턴스 사용)
settings: Settings = get_settings()

# --- 설정 값 ---
SECRET_KEY = settings.SECRET_KEY 
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# --- 해시 및 JWT 설정 ---
# Argon2 해시 알고리즘 설정
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# OAuth2PasswordBearer: 토큰을 추출하기 위한 의존성 주입 도구
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# ----------------- JWT 예외 처리 설정 (두 파일에서 모두 사용됨) -----------------
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

# --- 비밀번호 해시 및 검증 함수 ---

def get_password_hash(password: str) -> str:
    """비밀번호를 안전하게 해시합니다."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해시된 비밀번호를 비교합니다."""
    return pwd_context.verify(plain_password, hashed_password)

# --- JWT 토큰 생성 ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Access Token을 생성합니다. (환경 변수 값 사용)"""
    to_encode = data.copy()
    
    current_time = datetime.now(timezone.utc).replace(microsecond=0)
    
    if expires_delta:
        expire = current_time + expires_delta
    else:
        # 환경 변수에서 로드된 ACCESS_TOKEN_EXPIRE_MINUTES를 사용하여 만료 시간을 설정합니다.
        expire = current_time + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES) 
        
    to_encode.update({"exp": expire})
    # 환경 변수에서 로드된 SECRET_KEY와 ALGORITHM을 사용하여 JWT를 인코딩합니다.
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM) 
    return encoded_jwt

# ----------------- JWT 토큰 검증 (DB 조회 없이 TokenData만 반환) -----------------
def verify_token(token: str) -> TokenData:
    """
    JWT 토큰을 검증하고, 성공 시 페이로드에서 TokenData 객체를 생성하여 반환합니다.
    (DB 조회는 dependencies.py에서 담당합니다.)
    """
    try:
        # 환경 변수에서 로드된 SECRET_KEY와 ALGORITHM을 사용하여 JWT를 디코드합니다.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]) 
        
        # 'sub' 클레임에서 사용자 식별자(email)를 추출합니다.
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
        # TokenData 스키마에 맞게 객체를 생성하여 반환합니다.
        return TokenData(email=email)
        
    except JWTError:
        # 토큰 디코딩 실패 시 인증 예외 발생
        raise credentials_exception
        
