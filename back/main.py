from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# DB 설정 및 모델 임포트
from .database import engine, Base
from . import models 

# 라우터 임포트
from .routers import auth, project, user, memo

# 🌟 1. FastAPI 인스턴스를 하나만 생성하고 설정을 적용합니다.
app = FastAPI(
    title="MindMap Collaboration API",
    description="React 프론트엔드와 연동되는 마인드맵 협업 프로젝트 백엔드 (FastAPI)",
    version="1.0.0"
)

# DB 테이블 생성 (models.py에서 정의된 모든 테이블이 생성됩니다.)
# 이 부분은 app 인스턴스 생성 직후에 있어야 DB가 준비됩니다.
Base.metadata.create_all(bind=engine)

# 💡 CORS 설정 적용
origins = [
    "http://localhost:3000", # React 앱이 실행되는 주소 허용
    "http://127.0.0.1:3000",
    # 프로덕션 환경의 프론트엔드 주소도 추가해야 합니다.
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # 허용할 오리진 목록
    allow_credentials=True, # 쿠키 및 인증 정보 허용
    allow_methods=["*"], # 모든 HTTP 메서드 (GET, POST, PUT, DELETE 등) 허용
    allow_headers=["*"], # 모든 헤더 허용 (Authorization 헤더 포함)
)

# 🌟 2. 라우터 등록 및 경로 접두사 설정:
# 모든 API 라우터를 /api/v1 접두사 아래에 등록하여 구조를 명확히 하고 중복을 제거했습니다.
# (예: /signup 대신 /api/v1/auth/signup 경로를 사용해야 합니다.)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["1. 인증 및 사용자"])
app.include_router(user.router, prefix="/api/v1/user", tags=["2. 사용자 및 친구"])
app.include_router(memo.router, prefix="/api/v1/memo", tags=["3. 메모 관리"])
app.include_router(project.router, prefix="/api/v1/projects", tags=["4. 프로젝트 및 마인드맵"])


@app.get("/", tags=["Root"])
def read_root():
    return {"message": "MindMap Collaboration API is running."}

if __name__ == "__main__":
    # 개발 환경에서 uvicorn 실행
    uvicorn.run(app, host="0.0.0.0", port=8000)
