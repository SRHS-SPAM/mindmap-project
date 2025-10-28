from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
# FastAPI 프로젝트의 구조에 따라 필요한 모듈을 임포트합니다.
# 실제 프로젝트 구조에 맞게 .database, .models, .schemas를 수정해야 할 수 있습니다.
from .database import get_db 
from .models import User 
from .schemas import TokenData 

# config.py에서 설정을 가져오는 함수와 설정 모델을 임포트합니다.
from .config import get_settings, Settings 

# 애플리케이션 설정을 로드합니다. (캐시된 단일 인스턴스 사용)
settings: Settings = get_settings()

# --- 설정 값은 이제 환경 변수/.env 파일에서 로드됩니다 ---
SECRET_KEY = settings.SECRET_KEY 
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# --- 해시 및 JWT 설정 ---
# Argon2 해시 알고리즘 설정
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# OAuth2PasswordBearer: 토큰을 추출하기 위한 의존성 주입 도구
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# --- 비밀번호 해시 및 검증 함수 ---

def get_password_hash(password: str) -> str:
    """비밀번호를 안전하게 해시합니다."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해시된 비밀번호를 비교합니다."""
    return pwd_context.verify(plain_password, hashed_password)

# --- JWT 토큰 생성 및 검증 ---
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

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """JWT 토큰에서 현재 사용자 정보를 추출하고 유효성을 검증합니다. (환경 변수 값 사용)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 환경 변수에서 로드된 SECRET_KEY와 ALGORITHM을 사용하여 JWT를 디코드합니다.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]) 
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    # 데이터베이스에서 사용자 정보를 조회합니다.
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    """활성화된 현재 사용자 객체를 반환하는 의존성 주입 함수입니다."""
    return current_user
