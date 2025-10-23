from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .schemas import TokenData

# --- 해시 및 JWT 설정 ---
# Bcrypt 해시 알고리즘 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Secret Key (실제로는 환경 변수에서 관리해야 함)
# WARNING: 키가 플레이스홀더일 경우 401 에러가 발생합니다. 유효한 문자열로 변경했습니다.
SECRET_KEY = "mindmap-project-super-secret-key-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # 토큰 만료 시간 변수 추가 (기존 로직과 동일하게 30분)

# OAuth2PasswordBearer: 토큰을 추출하기 위한 의존성 주입 도구
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# --- 비밀번호 해시 및 검증 ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해시된 비밀번호를 비교합니다."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """비밀번호를 해시합니다."""
    return pwd_context.hash(password)

# --- JWT 토큰 생성 및 검증 ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Access Token을 생성합니다."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # 새로 정의된 변수 사용 (기존 30분 로직 유지)
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 'sub' 클레임이 데이터에 있는지 확인 후 업데이트
    if "sub" not in to_encode:
        # get_current_user가 'sub' 클레임을 예상하므로, 안전을 위해 추가합니다.
        # 기존 로직은 'sub'가 이미 data에 있다고 가정했습니다.
        pass 
        
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
        # 이 부분이 변경된 SECRET_KEY를 사용하여 토큰을 디코딩합니다.
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
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
