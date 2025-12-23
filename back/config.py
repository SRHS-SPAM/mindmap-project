from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import secrets
import os

class Settings(BaseSettings):
    """
    환경 변수와 .env 파일에서 애플리케이션 설정을 로드하는 클래스입니다.
    """
    # ✅ SECRET_KEY: 환경변수 우선, 없으면 랜덤 생성 (개발용)
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 추가 설정 (필요시)
    DATABASE_URL: str = "sqlite:///./mindmap.db"
    GCP_PROJECT_ID: str = ""
    GCP_REGION: str = "us-central1"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False  # 대소문자 구분 안 함
    )

@lru_cache()
def get_settings() -> Settings:
    """
    Settings 객체를 한 번만 생성하고 캐시하여 애플리케이션 전반에서 효율적으로 사용합니다.
    """
    settings = Settings()
    
    # 개발 환경에서 경고 출력
    if settings.SECRET_KEY == secrets.token_urlsafe(32):
        print("⚠️  WARNING: Using auto-generated SECRET_KEY. Set SECRET_KEY environment variable in production!")
    
    return settings