from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..security import get_password_hash, verify_password, create_access_token, get_current_active_user
from ..models import User 
# 🚨 수정됨: UserLogin 스키마를 추가로 임포트합니다.
from ..schemas import UserCreate, UserLogin, User as UserSchema, Token 

router = APIRouter()

# --- JWT 설정 ---
ACCESS_TOKEN_EXPIRE_MINUTES = 30

@router.post("/signup", response_model=UserSchema, summary="일반 회원가입")
def signup_user(user: UserCreate, db: Session = Depends(get_db)):
    # 이메일 중복 확인
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # 비밀번호 해시
    hashed_password = get_password_hash(user.password)
    
    # User 인스턴스 생성 시 name 필드 추가
    db_user = User(
        email=user.email, 
        name=user.name, # name 필드 추가
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# 🚨 수정됨: 입력 스키마를 UserCreate 대신 UserLogin으로 변경했습니다.
@router.post("/login", response_model=Token, summary="일반 로그인")
def login_for_access_token(user: UserLogin, db: Session = Depends(get_db)):
    # 사용자 이메일로 조회
    db_user = db.query(User).filter(User.email == user.email).first()
    
    # 사용자 존재 여부 및 비밀번호 확인
    if not db_user or not verify_password(user.password, db_user.hashed_password):
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

# --- 소셜 로그인 (Mock) ---
@router.post("/oauth/{provider}", response_model=Token, summary="소셜 로그인 (Mock)")
def social_login_mock(provider: str, db: Session = Depends(get_db)):
    # provider는 URL 경로에서 자동으로 추출됩니다 (예: kakao, google, naver)
    
    # 목업 구현: 'mock_user@social.com' 사용자로 가정하고 토큰을 발급합니다.
    email = f"mock_user_{provider}@social.com"
    db_user = db.query(User).filter(User.email == email).first()
    
    if not db_user:
        # 소셜 신규 회원가입 처리 (name은 이메일 앞부분으로 임시 설정)
        db_user = User(
            email=email, 
            name=f"Social User ({provider})", # 임시 name 설정
            hashed_password=get_password_hash("social_temp_pass"), 
            social_provider=provider
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- 현재 사용자 정보 확인 ---
@router.get("/me", response_model=UserSchema, summary="내 정보 조회")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user
