import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. DB 접속 URL 가져오기
# Cloud Run 환경에서는 DATABASE_URL이 없을 수 있으므로 기본값 제공
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    # 기본값: SQLite (개발/테스트용)
    "sqlite:///./mindmap.db"
)

print(f"🔌 Connecting to database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")

# 2. SQLAlchemy Engine 생성
try:
    # SQLite인 경우 추가 설정 필요
    connect_args = {}
    if DATABASE_URL.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        print("⚠️  Using SQLite - this is for development only!")
    
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args=connect_args,
        # PostgreSQL/MySQL인 경우에만 풀 설정 적용
        **({
            "pool_size": 20,
            "max_overflow": 30
        } if not DATABASE_URL.startswith("sqlite") else {})
    )
    
    # 연결 테스트
    with engine.connect() as conn:
        print("✅ Database connection successful!")
        
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    print("⚠️  Application will start but database features may not work.")
    # Cloud Run에서는 에러가 있어도 일단 앱을 시작시키기
    # 실제 운영에서는 DB 없이는 못 돌아가니까 나중에 Cloud SQL 연결하면 됨

# 3. 데이터베이스 세션 클래스 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. 모든 ORM 모델의 기본 클래스 정의
Base = declarative_base()

# 5. 의존성 주입을 위한 DB 세션 함수
def get_db():
    """요청마다 새로운 DB 세션을 생성하고, 응답 후 세션을 닫아줍니다."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()