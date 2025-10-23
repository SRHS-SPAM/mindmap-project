from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# DB 설정 및 모델 임포트
# DB Engine과 Base를 임포트하여 테이블 생성을 수행합니다.
from .database import engine, Base

# ORM 모델을 임포트해야 Base.metadata.create_all()이 해당 테이블들을 인식할 수 있습니다.
from . import models 

# 라우터 임포트 (파일 구조에 따라 routers 디렉토리 내에 있다고 가정)
# 만약 파일이 없다면, 반드시 해당 파일을 생성해야 합니다.
from .routers import auth, project, user, memo

# DB 테이블 생성 (models.py에서 정의된 모든 테이블이 생성됩니다.)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MindMap Collaboration API",
    description="React 프론트엔드와 연동되는 마인드맵 협업 프로젝트 백엔드 (FastAPI)",
    version="1.0.0"
)

# CORS 설정: React 프론트엔드와 통신을 위해 필요합니다.
origins = [
    "http://localhost:3000", # React 개발 서버 주소
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록 및 경로 접두사 설정
app.include_router(auth.router, prefix="/api/v1/auth", tags=["1. 인증 및 사용자"])
app.include_router(user.router, prefix="/api/v1/user", tags=["2. 사용자 및 친구"])
app.include_router(memo.router, prefix="/api/v1/memo", tags=["3. 메모 관리"])
# 핵심 수정 부분: 프로젝트 관련 모든 API의 경로를 /api/v1/projects로 설정
app.include_router(project.router, prefix="/api/v1/projects", tags=["4. 프로젝트 및 마인드맵"])
app.include_router(project.router, prefix="/projects", tags=["projects"])
app.include_router(auth.router) # auth 라우터 추가


@app.get("/", tags=["Root"])
def read_root():
    return {"message": "MindMap Collaboration API is running."}

if __name__ == "__main__":
    # 개발 환경에서 uvicorn 실행
    uvicorn.run(app, host="0.0.0.0", port=8000)
