from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .schemas import TokenData

# --- 해시 및 JWT 설정 ---
# Argon2 해시 알고리즘 설정 (bcrypt의 72바이트 제한이 사라집니다)
# Argon2는 메모리, 시간, 병렬 처리 능력 조절이 가능하여 최신 보안 표준입니다.
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# JWT Secret Key (실제로는 환경 변수에서 관리해야 함)
SECRET_KEY = "mindmap-project-super-secret-key-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # 토큰 만료 시간

# OAuth2PasswordBearer: 토큰을 추출하기 위한 의존성 주입 도구
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# --- 비밀번호 해시 및 검증 ---

# Argon2는 비밀번호 길이에 제한이 없으므로, bcrypt를 위한 정제 함수가 필요 없습니다.

def get_password_hash(password: str) -> str:
    """비밀번호를 해시합니다. Argon2는 길이 제한 없이 안전하게 처리합니다."""
    # 이제 비밀번호를 정제할 필요 없이 바로 해시합니다.
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해시된 비밀번호를 비교합니다."""
    # 이제 평문 비밀번호를 정제할 필요 없이 바로 검증합니다.
    return pwd_context.verify(plain_password, hashed_password)

# --- JWT 토큰 생성 및 검증 ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Access Token을 생성합니다."""
    to_encode = data.copy()
    
    current_time = datetime.now(timezone.utc).replace(microsecond=0)
    
    if expires_delta:
        expire = current_time + expires_delta
    else:
        # 기존 30분 로직 유지
        expire = current_time + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """JWT 토큰에서 현재 사용자 정보를 추출합니다."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    """활성화된 현재 사용자 객체를 반환합니다."""
    # is_active 로직은 필요에 따라 유지됩니다.
    return current_user
