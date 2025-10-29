import os
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
# 🚨 friend_code 생성을 위한 함수 임포트
from ..utils import create_friend_code, save_profile_image, UPLOAD_FOLDER, DEFAULT_PROFILE_IMAGE
from ..security import get_password_hash, verify_password, create_access_token
from ..dependencies import get_current_active_user
from ..models import User 
from ..schemas import UserCreate, UserLogin, User as UserSchema, Token, UserUpdateName, UserUpdatePassword # 🚨 스키마 추가 임포트

# 🎯 라우터 1: 기본 인증 기능 (접두사 없음: /signup, /login)
auth_router_base = APIRouter()

# 🎯 라우터 2: 보호된 사용자 기능 (접두사 /auth: /auth/me, /auth/me/password 등)
# 이 라우터에 등록된 모든 경로는 내부적으로 /auth 접두사를 가집니다.
auth_router_protected = APIRouter(
    prefix="/auth" 
)

# --- JWT 설정 ---
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ----------------------------------------------------------------------
# 1. auth_router_base (최종 경로: /api/v1/signup, /api/v1/login, /api/v1/oauth/{provider})
# ----------------------------------------------------------------------

@auth_router_base.post("/signup", response_model=UserSchema, summary="일반 회원가입")
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
        friend_code=new_friend_code # 🚨 친구 코드 저장
    )
        
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@auth_router_base.post("/login", response_model=Token, summary="일반 로그인")
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
@auth_router_base.post("/oauth/{provider}", response_model=Token, summary="소셜 로그인 (Mock)")
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


# ----------------------------------------------------------------------
# 2. auth_router_protected (최종 경로: /api/v1/auth/me, /api/v1/auth/me/name, ...)
# ----------------------------------------------------------------------

# --- 현재 사용자 정보 확인 (최종 경로: /api/v1/auth/me) ---
@auth_router_protected.get("/me", response_model=UserSchema, summary="내 정보 조회 (이메일 포함)")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    현재 로그인된 사용자 정보를 반환합니다. 
    이 엔드포인트를 통해 본인의 이메일, 이름 등을 확인할 수 있습니다.
    """
    return current_user

# --- 🚨 새 기능: 이름 변경 (최종 경로: /api/v1/auth/me/name) ---
@auth_router_protected.put("/me/name", response_model=UserSchema, summary="내 이름 변경")
async def update_user_name(
    user_update: UserUpdateName,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 로그인된 사용자의 이름을 변경합니다.
    """
    db_user = db.query(User).filter(User.id == current_user.id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in database.")

    db_user.name = user_update.name
    db.commit()
    db.refresh(db_user)

    return db_user


# --- 🚨 새 기능: 비밀번호 변경 (최종 경로: /api/v1/auth/me/password) ---
@auth_router_protected.put("/me/password", status_code=status.HTTP_204_NO_CONTENT, summary="비밀번호 변경 (현재 비밀번호 확인 필요)")
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
    return


# --- 🚨 새 기능: 프로필 사진 변경 (POST) (최종 경로: /api/v1/auth/me/profile_image) ---
@auth_router_protected.post("/me/profile_image", response_model=UserSchema, summary="내 프로필 사진 변경 (파일 업로드)")
async def upload_profile_image(
    file: UploadFile = File(..., description="업로드할 프로필 이미지 파일"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 로그인된 사용자의 프로필 사진을 업로드하고, URL을 DB에 저장합니다.
    """
    # 1. 파일 유효성 검사 (MIME 타입)
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Invalid image format: {file.content_type}. Only JPEG, PNG, WEBP are allowed."
        )

    # 2. 파일 저장 및 URL 생성
    try:
        image_url = await save_profile_image(file, current_user.id) # 🚨 utils.py의 함수 호출
    except Exception as e:
        # 파일 저장 중 오류 발생
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Could not upload image: {str(e)}"
        )

    # 3. DB 업데이트
    db_user = db.query(User).filter(User.id == current_user.id).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    db_user.profile_image_url = image_url
    db.commit()
    db.refresh(db_user)

    # 4. 업데이트된 사용자 정보 반환
    return db_user

@auth_router_protected.get("/me/profile_image")
async def get_profile_image(
    db: Session = Depends(get_db), # DB 세션도 여전히 필요합니다.
    # 🎯 이제 클라이언트가 유효한 JWT 토큰을 보내야만 이 함수가 실행됩니다.
    db_user: User = Depends(get_current_active_user) 
):
    """
    현재 로그인된 사용자 (유효한 토큰으로 인증된 사용자)의 프로필 이미지를 반환합니다.
    """
    
    # db_user는 get_current_active_user를 통해 이미 인증된 사용자 객체입니다.
    stored_path = db_user.profile_image_url
    
    # 기본 경로는 utils.py에 정의된 기본 아바타 파일 경로입니다.
    file_path = DEFAULT_PROFILE_IMAGE 
    
    if stored_path:
        # DB에 저장된 경로가 기본 이미지 경로와 다르다면
        if stored_path != DEFAULT_PROFILE_IMAGE:
            
            # 저장된 경로가 이미 전체 경로(uploaded_images/...)라면 그대로 사용합니다.
            if stored_path.startswith(UPLOAD_FOLDER):
                file_path = stored_path
            
            # 저장된 경로가 파일 이름 또는 profiles/filename.png 형태라면, UPLOAD_FOLDER를 붙여줍니다.
            else:
                 # os.path.basename()은 'profiles/abc.png' -> 'abc.png' 추출
                 filename = os.path.basename(stored_path)
                 # 최종 경로: uploaded_images/profiles/abc.png
                 # NOTE: 만약 파일이 'uploaded_images/profiles/' 폴더가 아닌 
                 # 'uploaded_images/' 바로 아래에 저장된다면 'profiles'를 제거해야 합니다.
                 file_path = os.path.join(UPLOAD_FOLDER, "profiles", filename)

    # 3. 파일 존재 여부 확인 및 반환
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    else:
        # 파일이 존재하지 않으면, 기본 이미지로 폴백합니다.
        if file_path != DEFAULT_PROFILE_IMAGE and os.path.exists(DEFAULT_PROFILE_IMAGE):
            return FileResponse(DEFAULT_PROFILE_IMAGE)
        
        # 기본 이미지도 없으면 404를 반환합니다.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile image not found. Checked paths: {file_path} and {DEFAULT_PROFILE_IMAGE}"
        )
