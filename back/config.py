from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import secrets
import os
import json

class Settings(BaseSettings):
    """
    환경 변수와 .env 파일에서 애플리케이션 설정을 로드하는 클래스입니다.
    """
    # ✅ SECRET_KEY: 환경변수 우선, 없으면 랜덤 생성 (개발용)
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 추가 설정
    DATABASE_URL: str = "sqlite:///./mindmap.db"
    DB_USER: str = "mindmap_user"
    DB_PASSWORD: str = "secret_password"
    DB_NAME: str = "mindmap_db"
    DB_HOST: str = "localhost"
    DB_PORT: str = "5432"
    
    GCP_PROJECT_ID: str = ""
    GCP_REGION: str = "us-central1"
    GCP_CREDENTIALS_JSON: str = ""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False
    )

def setup_gcp_credentials():
    """GCP 인증 파일 설정"""
    gcp_creds_json = os.getenv("GCP_CREDENTIALS_JSON")
    
    if gcp_creds_json:
        try:
            credentials_info = json.loads(gcp_creds_json)
            
            # /tmp 디렉토리에 임시 파일로 저장
            credentials_path = "/tmp/gcp-key.json"
            with open(credentials_path, "w") as f:
                json.dump(credentials_info, f)
            
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
            print("✅ GCP credentials loaded from environment variable")
            return credentials_path
            
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse GCP_CREDENTIALS_JSON: {e}")
            return None
            
    elif os.path.exists("gcp-key.json"):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gcp-key.json"
        print("✅ GCP credentials loaded from local file")
        return "gcp-key.json"
    else:
        print("⚠️ No GCP credentials found")
        return None

@lru_cache()
def get_settings() -> Settings:
    """
    Settings 객체를 한 번만 생성하고 캐시하여 애플리케이션 전반에서 효율적으로 사용합니다.
    """
    # GCP 인증 설정
    setup_gcp_credentials()
    
    settings = Settings()
    
    # 개발 환경에서 경고 출력
    if settings.SECRET_KEY == secrets.token_urlsafe(32):
        print("⚠️  WARNING: Using auto-generated SECRET_KEY. Set SECRET_KEY environment variable in production!")
    
    return settings