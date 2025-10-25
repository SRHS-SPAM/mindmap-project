import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import vertexai
# 💡 [추가] 로컬에서 .env 파일의 환경 변수를 로드하기 위해 필요합니다.
from dotenv import load_dotenv 

# DB 설정 및 모델 임포트
# 이 파일이 'back' 패키지 내부에 있다고 가정하고 상대 임포트 경로를 사용합니다.
from .database import engine, Base

# 라우터 임포트
# 💡 [수정] 'ai' 라우터를 올바른 상대 경로 임포트 목록에 추가했습니다.
from .routers import auth, project, user, memo, ai 

# 💡 [추가] 환경 변수 로드 (로컬 실행 환경을 위해)
load_dotenv()

# 🌟 1. FastAPI 인스턴스를 하나만 생성하고 설정을 적용합니다.
app = FastAPI(
    title="MindMap Collaboration API",
    description="React 프론트엔드와 연동되는 마인드맵 협업 프로젝트 백엔드 (FastAPI)",
    version="1.0.0"
)

# DB 테이블 생성 (models.py에서 정의된 모든 테이블이 생성됩니다.)
# 이 부분은 app 인스턴스 생성 직후에 있어야 DB가 준비됩니다.
Base.metadata.create_all(bind=engine)

# 💡 Vertex AI 초기화
@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 Vertex AI 초기화"""
    try:
        # .env 파일에 정의된 변수 이름과 일치하도록 환경 변수 로드
        project_id = os.getenv("GCP_PROJECT_ID")
        location = os.getenv("GCP_REGION", "us-central1") 
        
        if not project_id:
            # 프로젝트 ID가 없으면 Vertex AI 초기화는 건너뜁니다.
            print("경고: GCP_PROJECT_ID 환경 변수가 설정되지 않았습니다. Vertex AI 기능이 비활성화됩니다.")
            return
        
        vertexai.init(project=project_id, location=location)
        print(f"✅ Vertex AI 초기화 성공! (Project: {project_id}, Location: {location})")
    except Exception as e:
        print(f"❌ Vertex AI 초기화 오류: {e}")
        print("환경 변수(GCP_PROJECT_ID, GCP_REGION)와 인증 상태를 확인하세요.")

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
# 🚨 주의: 각 라우터 파일에 prefix가 이미 설정되어 있으므로, 
# main.py에서는 최상위 prefix인 '/api/v1'만 적용하는 것이 중복을 막는 좋은 방법입니다.
# 하지만 기존 코드 스타일을 유지하기 위해, 중복 prefix를 피하기 위해 라우터 파일의 prefix가 
# 메인 등록시 무시된다고 가정하고 다음과 같이 등록합니다.
app.include_router(auth.router, prefix="/api/v1/auth", tags=["1. 인증 및 사용자"])
app.include_router(user.router, prefix="/api/v1/user", tags=["2. 사용자 및 친구"])
app.include_router(memo.router, prefix="/api/v1/memo", tags=["3. 메모 관리"])
app.include_router(project.router, prefix="/api/v1/projects", tags=["4. 프로젝트 및 마인드맵"])
# 💡 [추가] AI 라우터 등록
app.include_router(ai.router, prefix="/api/v1/ai", tags=["5. AI 마인드맵 생성"])


@app.get("/", tags=["Root"])
def read_root():
    return {"message": "MindMap Collaboration API is running."}

if __name__ == "__main__":
    # 개발 환경에서 uvicorn 실행
    uvicorn.run(app, host="0.0.0.0", port=8000)
