from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, User, Token
from ..security import get_password_hash, verify_password, create_access_token, get_current_active_user, ALGORITHM
from datetime import timedelta

router = APIRouter()

# --- JWT 설정 ---
ACCESS_TOKEN_EXPIRE_MINUTES = 30

@router.post("/signup", response_model=User)
def signup_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login_for_access_token(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- 소셜 로그인 (Mock) ---
@router.post("/oauth/kakao", response_model=Token, summary="카카오 로그인 (Mock)")
@router.post("/oauth/google", response_model=Token, summary="구글 로그인 (Mock)")
@router.post("/oauth/naver", response_model=Token, summary="네이버 로그인 (Mock)")
def social_login_mock(provider: str, db: Session = Depends(get_db)):
    # 실제 소셜 로그인 로직:
    # 1. 프론트엔드로부터 인가 코드(Code)를 받습니다.
    # 2. 해당 코드로 각 소셜 서버에 접근 토큰을 요청합니다.
    # 3. 접근 토큰으로 사용자 정보를 가져옵니다.
    # 4. DB에서 소셜 ID로 사용자를 찾거나 새로 생성합니다.
    
    # 목업 구현: 'mock_user@social.com' 사용자로 가정하고 토큰을 발급합니다.
    email = f"mock_user_{provider}@social.com"
    db_user = db.query(User).filter(User.email == email).first()
    
    if not db_user:
        # 소셜 신규 회원가입 처리
        db_user = User(email=email, hashed_password=get_password_hash("social_temp_pass"), social_provider=provider)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- 현재 사용자 정보 확인 ---
@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# --- 보안 헬퍼 함수는 security.py에 정의되어야 합니다. ---
# security.py 내용은 다음 파일에서 정의합니다.
