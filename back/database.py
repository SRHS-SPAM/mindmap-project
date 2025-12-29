import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. DB 접속 URL 구성
def get_database_url():
    """환경변수에서 DATABASE_URL 또는 개별 DB 설정을 읽어서 URL 구성"""
    
    # 먼저 DATABASE_URL 환경변수 확인
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        print(f"📊 Using DATABASE_URL from environment")
        return database_url
    
    # DATABASE_URL이 없으면 개별 설정으로 구성
    db_user = os.getenv("DB_USER", "mindmap_user")
    db_password = os.getenv("DB_PASSWORD", "secret_password")
    db_name = os.getenv("DB_NAME", "mindmap_db")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    
    # Cloud SQL인 경우 (/cloudsql/로 시작)
    if db_host.startswith("/cloudsql/"):
        database_url = f"postgresql+psycopg2://{db_user}:{db_password}@/{db_name}?host={db_host}"
        print(f"📊 Using Cloud SQL: {db_name}")
    # 일반 PostgreSQL
    elif db_host != "localhost":
        database_url = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        print(f"📊 Using PostgreSQL: {db_host}:{db_port}/{db_name}")
    # 로컬 개발 (SQLite)
    else:
        database_url = "sqlite:///./mindmap.db"
        print("⚠️  Using SQLite - this is for development only!")
    
    return database_url

DATABASE_URL = get_database_url()
print(f"🔌 Database URL configured: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'SQLite'}")

# 2. SQLAlchemy Engine 생성
try:
    # SQLite인 경우 추가 설정 필요
    connect_args = {}
    engine_args = {
        "pool_pre_ping": True,
    }
    
    if DATABASE_URL.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        print("⚠️  SQLite mode - for development only!")
    else:
        # PostgreSQL/MySQL인 경우 풀 설정
        engine_args.update({
            "pool_size": 20,
            "max_overflow": 30
        })
    
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        **engine_args
    )
    
    # 연결 테스트
    with engine.connect() as conn:
        print("✅ Database connection successful!")
        
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    print("⚠️  Application will start but database features may not work.")
    # 기본 SQLite 엔진으로 폴백
    DATABASE_URL = "sqlite:///./mindmap.db"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

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