import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. DB 접속 URL 가져오기
# docker-compose.yml에 설정된 환경 변수 DATABASE_URL을 사용합니다.
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # 환경 변수가 설정되지 않았을 경우를 대비한 안전 장치 (컨테이너 내부에서는 필요 없음)
    print("FATAL: DATABASE_URL 환경 변수를 찾을 수 없습니다.")
    exit(1)

# 2. SQLAlchemy Engine 생성
# pool_pre_ping=True: DB 연결이 유효한지 주기적으로 확인하여 연결 끊김 오류 방지
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# 3. 데이터베이스 세션 클래스 생성
# 이 클래스의 인스턴스가 실제 DB 연결 및 트랜잭션을 처리합니다.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. 모든 ORM 모델의 기본 클래스 정의
# 모델을 정의할 때 이 Base 클래스를 상속받아 사용합니다.
Base = declarative_base()

# 5. 의존성 주입(Dependency Injection)을 위한 DB 세션 함수
# FastAPI 라우터에서 이 함수를 사용하여 DB 세션을 주입받습니다.
def get_db():
    """요청마다 새로운 DB 세션을 생성하고, 응답 후 세션을 닫아줍니다."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
