import os
import time
from fastapi import UploadFile, HTTPException
from typing import Optional

# 주의: 실제 GCP(Google Cloud Platform) 연동 코드는 보안상 및 실행 환경 제약으로 인해 포함할 수 없습니다.
# 이 코드는 파일 업로드가 성공했다고 가정하고 Mock URL을 반환합니다.
# 실제 구현 시에는 이 파일에 Google Cloud Storage Python Client 라이브러리를 사용하여
# 파일 업로드, 권한 설정, 공개 URL 생성 로직을 구현해야 합니다.

class StorageService:
    """
    파일 업로드를 처리하고 저장된 파일의 URL을 반환하는 서비스입니다.
    현재는 Mock URL을 반환하지만, 실제 GCP Storage 로직이 들어갈 자리입니다.
    """
    def __init__(self):
        # 실제 GCP Storage 클라이언트 초기화 코드 (예: self.storage_client = storage.Client())
        pass

    async def upload_profile_image(self, file: UploadFile, user_id: int) -> str:
        """
        프로필 이미지를 클라우드 스토리지에 업로드하고 접근 URL을 반환합니다.
        
        Args:
            file: FastAPI UploadFile 객체 (업로드된 파일 데이터).
            user_id: 파일 소유자의 ID.
            
        Returns:
            저장된 파일의 공개 접근 URL.
        """
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")

        # 1. 파일 이름 생성 및 경로 설정 (실제 스토리지 버킷 내 경로)
        # 예: user_profiles/{user_id}/profile_photo_{timestamp}.jpg
        # file_extension = os.path.splitext(file.filename)[1]
        # storage_path = f"user_profiles/{user_id}/profile_photo_{int(time.time())}{file_extension}"

        # 2. 실제 파일 스트리밍 및 업로드 로직 (이 부분은 Mock 처리)
        # file_contents = await file.read()
        # await self._upload_to_gcp(storage_path, file_contents) 
        
        # Mock URL 반환 (실제 서비스에서는 이 URL을 DB에 저장합니다.)
        # 이 URL은 클라이언트가 이미지를 불러올 수 있는 공개 경로여야 합니다.
        mock_url = (
            f"https://api.example.com/assets/profiles/{user_id}/"
            f"photo_{int(time.time())}.jpg"
        )
        
        # 파일 포인터를 초기화하여 파일 이름 등에 접근할 수 있게 합니다.
        await file.seek(0)

        return mock_url

# 서비스 인스턴스
storage_service = StorageService()
