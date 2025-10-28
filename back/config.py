from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# BaseSettings를 상속받아 환경 변수를 로드할 설정 클래스를 정의합니다.
# pydantic-settings는 .env 파일을 자동으로 찾아서 변수를 로드합니다.
class Settings(BaseSettings):
    """
    환경 변수와 .env 파일에서 애플리케이션 설정을 로드하는 클래스입니다.
    """
    # 환경 변수의 이름과 자료형을 지정합니다.
    # 환경 변수가 설정되지 않으면 오른쪽에 정의된 기본값이 사용됩니다.
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # model_config를 사용하여 설정 파일의 위치와 로드 방법을 지정합니다.
    model_config = SettingsConfigDict(
        env_file=".env",     # 로드할 환경 변수 파일 지정
        extra="ignore"       # Settings 클래스에 없는 변수는 무시
    )

@lru_cache()
def get_settings() -> Settings:
    """
    Settings 객체를 한 번만 생성하고 캐시하여 애플리케이션 전반에서 효율적으로 사용합니다.
    """
    return Settings()
