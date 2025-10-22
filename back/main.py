from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import json
from datetime import datetime

# DB 설정 및 모델 임포트
from .database import engine, Base, get_db
from . import models

# 라우터 및 서비스 임포트
# .routers.project 대신 .routers import project를 사용한다고 가정합니다.
from .routers import auth, project, user, memo
from .schemas import MindMapNodeBase, MindMapData

# DB 테이블 생성
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

# 라우터 등록 수정: 클라이언트의 요청 경로 (/api/v1/projects)에 맞춰 'project' 라우터를 등록합니다.
app.include_router(auth.router, prefix="/api/v1/auth", tags=["1. 인증 및 사용자"])
app.include_router(user.router, prefix="/api/v1/user", tags=["2. 사용자 및 친구"])
app.include_router(memo.router, prefix="/api/v1/memo", tags=["3. 메모 관리"])
# 기존: app.include_router(project.router, prefix="/api/v1/project", tags=["4. 프로젝트 및 마인드맵"]) (단수형)
# 기존: app.include_router(project.router, prefix="/projects", tags=["projects"]) (접두사 누락)

# 수정: 정확한 경로 prefix="/api/v1/projects"로 등록합니다.
app.include_router(project.router, prefix="/api/v1/projects", tags=["4. 프로젝트 및 마인드맵"])

# 기존 코드에 있던 불필요한 중복 라우터 등록 제거
# app.include_router(auth.router) 


@app.get("/", tags=["Root"])
def read_root():
    return {"message": "MindMap Collaboration API is running."}

if __name__ == "__main__":
    # 개발 환경에서만 uvicorn 실행 (실제 배포 환경에 따라 수정될 수 있습니다.)
    uvicorn.run(app, host="0.0.0.0", port=8000)
