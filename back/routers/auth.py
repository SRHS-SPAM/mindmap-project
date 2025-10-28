from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
# 🚨 friend_code 생성을 위한 함수 임포트
from ..utils import create_friend_code 
from ..security import get_password_hash, verify_password, create_access_token, get_current_active_user
from ..models import User 
from ..schemas import UserCreate, UserLogin, User as UserSchema, Token, UserUpdateName, UserUpdatePassword # 🚨 스키마 추가 임포트

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
        
    # 🚨 친구 코드 생성
    # 유니크한 친구 코드를 생성하고 중복이 없을 때까지 재시도합니다.
    while True:
        new_friend_code = create_friend_code()
        if not db.query(User).filter(User.friend_code == new_friend_code).first():
            break
        
    # User 인스턴스 생성 시 name 필드 및 friend_code 필드 추가
    db_user = User(
        email=user.email, 
        name=user.name,
        hashed_password=hashed_password,
        friend_code=new_friend_code  # 🚨 친구 코드 저장
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
        # 🚨 소셜 로그인/회원가입 시에도 친구 코드 생성
        while True:
            new_friend_code = create_friend_code()
            if not db.query(User).filter(User.friend_code == new_friend_code).first():
                break

        # 소셜 신규 회원가입 처리 (name은 이메일 앞부분으로 임시 설정)
        db_user = User(
            email=email, 
            name=f"Social User ({provider})", # 임시 name 설정
            hashed_password=get_password_hash("social_temp_pass"), 
            social_provider=provider,
            friend_code=new_friend_code # 🚨 친구 코드 저장
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
@router.get("/me", response_model=UserSchema, summary="내 정보 조회 (이메일 포함)")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    현재 로그인된 사용자 정보를 반환합니다. 
    이메일은 수정할 수 없지만, 이 엔드포인트를 통해 본인의 이메일을 확인할 수 있습니다.
    """
    return current_user

# --- 🚨 새 기능: 이름 변경 ---
@router.put("/me/name", response_model=UserSchema, summary="내 이름 변경")
async def update_user_name(
    user_update: UserUpdateName,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 로그인된 사용자의 이름을 변경합니다.
    404 오류 수정 및 본인 정보만 변경됨을 보장합니다.
    """
    # current_user는 이미 DB에서 로드된 User ORM 객체입니다.
    # 해당 세션에 연결된 객체를 사용하거나, ID로 다시 조회하여 사용합니다.
    
    # ID로 다시 조회하여 세션에 연결된 객체를 명확히 사용 (안전성 확보)
    db_user = db.query(User).filter(User.id == current_user.id).first()
    
    if not db_user:
        # 이 경우는 사실상 발생하기 어렵지만, 보안을 위해 처리합니다.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in database.")
    
    db_user.name = user_update.name
    db.commit()
    db.refresh(db_user)
    
    return db_user


# --- 🚨 새 기능: 비밀번호 변경 ---
@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT, summary="비밀번호 변경 (현재 비밀번호 확인 필요)")
async def update_user_password(
    password_update: UserUpdatePassword,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 비밀번호가 일치할 경우에만 새 비밀번호로 변경합니다.
    """
    db_user = db.query(User).filter(User.id == current_user.id).first()
    
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        
    # 1. 현재 비밀번호 확인
    if not verify_password(password_update.old_password, db_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect current password.")
        
    # 2. 새 비밀번호 해싱 및 업데이트
    new_hashed_password = get_password_hash(password_update.new_password)
    db_user.hashed_password = new_hashed_password
    
    db.commit()
    # 204 No Content는 응답 본문이 없음을 의미합니다.
    return
