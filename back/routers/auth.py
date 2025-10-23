from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm # ⭐️ 추가: 폼 데이터 처리를 위한 클래스
from sqlalchemy.orm import Session
from datetime import timedelta

# DB, Security, Models, Schemas는 실제 프로젝트 구조에 맞게 임포트 경로를 수정하세요.
from ..database import get_db
from ..security import get_password_hash, verify_password, create_access_token, get_current_active_user
from ..models import User 
from ..schemas import UserCreate, User as UserSchema, Token 

router = APIRouter()

# --- JWT 설정 ---
ACCESS_TOKEN_EXPIRE_MINUTES = 30

@router.post("/signup", response_model=UserSchema, summary="일반 회원가입")
def signup_user(user: UserCreate, db: Session = Depends(get_db)):
    """일반 이메일/비밀번호를 사용하는 신규 회원가입을 처리합니다."""
    # 이메일 중복 확인
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # 비밀번호 해시 및 사용자 생성
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email, 
        name=user.name,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ⭐️ 수정된 로그인 엔드포인트 
# OAuth2PasswordRequestForm은 Content-Type: application/x-www-form-urlencoded을 기대합니다.
@router.post("/login", response_model=Token, summary="일반 로그인")
def login_for_access_token(
    # Depends()를 사용하여 폼 데이터를 자동으로 파싱하고 form_data 변수에 주입합니다.
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """이메일(username)과 비밀번호로 JWT 액세스 토큰을 발급합니다."""
    
    # OAuth2 표준에 따라 ID는 form_data.username으로 전달되므로, 이를 User.email과 비교합니다.
    db_user = db.query(User).filter(User.email == form_data.username).first()
    
    # 사용자 존재 여부 및 비밀번호 확인 (form_data.password 사용)
    if not db_user or not verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # JWT 토큰 생성
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- 소셜 로그인 (Mock) 및 사용자 정보 조회는 동일합니다 ---
@router.post("/oauth/{provider}", response_model=Token, summary="소셜 로그인 (Mock)")
def social_login_mock(provider: str, db: Session = Depends(get_db)):
    # ... (생략)
    pass # 실제 코드는 위에서 제공된 내용과 동일합니다.

@router.get("/me", response_model=UserSchema, summary="내 정보 조회")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user
