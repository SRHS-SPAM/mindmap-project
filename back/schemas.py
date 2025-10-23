from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- 인증 및 사용자 기본 스키마 ---
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# --- 인증 및 사용자 기본 스키마 ---
class UserBase(BaseModel):
    email: EmailStr
    name: str # models.User에도 name 컬럼이 존재함

# 🚨 수정: UserLogin 스키마를 새로 정의하여 name 필드를 제외합니다.
class UserLogin(BaseModel):
    """사용자 로그인 시 필요 (email과 password만 포함)"""
    email: EmailStr
    password: str

class UserCreate(UserBase):
    """사용자 회원가입 시 필요 (password 포함)"""
    password: str

class Token(BaseModel):
    """JWT 토큰 응답 모델"""
    access_token: str
    token_type: str

class User(UserBase):
    """사용자 정보 응답 모델 (password 제외)"""
    id: int
    is_active: bool
    last_activity: Optional[datetime] = None # 온라인 상태 확인용
    is_online: bool # models.User에 is_online 필드 추가됨
    
    # 🚨 추가: 소셜 로그인 필드 (optional)
    social_provider: Optional[str] = None 

    class Config:
        from_attributes = True

class UserUpdateStatus(BaseModel):
    timestamp: datetime # 클라이언트가 현재 시간을 보냄


# 토큰 스키마 (인증 라우터에서 사용)
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- 친구 관계 스키마 ---
class FriendRequest(BaseModel):
    recipient_email: EmailStr # 친구 요청을 보낼 이메일

class FriendStatus(BaseModel):
    id: int
    user_id: int
    friend_id: int
    status: str # "pending", "accepted", "rejected"
    
    class Config:
        from_attributes = True
    
# --- 메모 스키마 ---
class MemoBase(BaseModel):
    title: str
    content: str
    
class MemoCreate(MemoBase):
    """새 메모 생성 시 사용"""
    pass
    
class Memo(MemoBase):
    """메모 응답 모델"""
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime 

    class Config:
        from_attributes = True

# --- 프로젝트 관련 스키마 ---
class ProjectBase(BaseModel):
    title: str

class ProjectCreate(ProjectBase):
    """새 프로젝트 생성 시 사용"""
    pass

class ProjectUpdate(BaseModel):
    """프로젝트 정보 업데이트 시 사용"""
    title: Optional[str] = Field(None, description="업데이트할 프로젝트 제목")

    class Config:
        from_attributes = True
        
class ProjectMemberSchema(BaseModel):
    """프로젝트 멤버 목록에서 사용"""
    user_id: int
    is_admin: bool = False
    
    # 멤버의 상세 정보를 포함 (JOIN 결과)
    user: User # User 스키마 참조

    class Config:
        from_attributes = True

class Project(ProjectBase): # 최종적으로 라우터에서 사용될 프로젝트 응답 스키마
    id: int
    created_at: datetime
    is_generating: bool = False
    last_chat_id_processed: Optional[int] = None
    
    # 멤버 목록 포함 (List, 조회 시 사용)
    members: List[ProjectMemberSchema] = [] 

    class Config:
        from_attributes = True

# --- 채팅 스키마 ---
class ChatMessageCreate(BaseModel):
    content: str

class ChatMessage(ChatMessageCreate):
    id: int
    user_id: int
    project_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# --- 마인드맵 노드 스키마 ---
class MindMapNodeConnection(BaseModel):
    target_id: str

class MindMapNodeBase(BaseModel):
    id: str
    node_type: str # 핵심 주제, 대주제, 소주제
    title: str
    description: Optional[str] = None
    connections: List[MindMapNodeConnection] = []

class MindMapNode(MindMapNodeBase):
    project_id: int

    class Config:
        from_attributes = True

# routers/project.py에서 ORM 모델 이름 충돌을 피하기 위한 별칭
ORMMindMapNode = MindMapNode

# --- AI 결과 스키마 ---
class MindMapData(BaseModel):
    nodes: List[MindMapNodeBase] = []
    links: List[Dict[str, str]] = [] # Link는 nodes의 connections 정보로 프론트에서 생성할 수 있음

class AIAnalysisResult(BaseModel):
    is_success: bool
    last_chat_id: int
    mind_map_data: MindMapData

class AIRecommendation(BaseModel):
    recommendation: str
