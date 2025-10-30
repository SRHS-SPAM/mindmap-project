import random
import string
import os
import shutil
from fastapi import UploadFile

# 🚨 추가됨: 설정 상수 정의
UPLOAD_FOLDER = "uploaded_images"
PROFILE_DIR = os.path.join(UPLOAD_FOLDER, "profiles")

# 🎯 누락된 DEFAULT_PROFILE_IMAGE 상수 추가
DEFAULT_PROFILE_IMAGE = os.path.join(UPLOAD_FOLDER, "default_avatar.png") 

# 폴더가 없으면 생성 (앱 시작 시 한 번 실행)
os.makedirs(PROFILE_DIR, exist_ok=True)

def create_friend_code(length: int = 7) -> str:
    """
    대문자 알파벳과 숫자를 조합하여 고유한 친구 코드를 생성합니다.
    """
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for i in range(length))

# 파일 저장 함수 (로컬 디스크 기반)
async def save_profile_image(file: UploadFile, user_id: int) -> str:
    """
    프로필 이미지를 로컬 저장소에 저장하고 접근 가능한 URL을 반환합니다.
    
    주의: 이 함수를 사용하려면 FastAPI 애플리케이션에 
    정적 파일 서빙 설정(StaticFiles)이 되어 있어야 합니다.
    """
    
    # 1. 파일 이름 생성
    # user_id와 고유한 ID, 그리고 원래 확장자를 조합하여 저장 경로를 만듭니다.
    extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"user_{user_id}_{create_friend_code(10)}.{extension}"
    # 🚨 수정됨: 전역 PROFILE_DIR 사용
    file_path = os.path.join(PROFILE_DIR, unique_filename)
    
    # 2. 파일 저장
    # UploadFile.file을 사용하여 파일을 비동기적으로 저장합니다.
    try:
        # 파일 포인터를 처음으로 이동
        await file.seek(0)
        
        # 파일을 로컬 디스크에 저장
        with open(file_path, "wb") as buffer:
            # chunk 단위로 파일을 읽고 쓰기 (대용량 파일에 유리)
            shutil.copyfileobj(file.file, buffer)
            
    except Exception as e:
        # 파일 시스템 관련 오류 처리
        print(f"File save error: {e}")
        # 파일 저장 실패 시 500 에러를 던지도록 설정
        raise IOError("Could not save the image file to local storage.")

    # 3. 접근 URL 반환
    # 이 URL은 FastAPI 서버에서 정적 파일 서빙으로 접근 가능해야 합니다.
    # 🚨 수정됨: 전역 UPLOAD_FOLDER 사용
    image_url = f"/{UPLOAD_FOLDER}/profiles/{unique_filename}"
    
    return image_url
