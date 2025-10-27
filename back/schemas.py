from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- 인증 및 사용자 기본 스키마 ---
class UserBase(BaseModel):
    email: EmailStr
    name: str 

class UserLogin(BaseModel):
    """사용자 로그인 시 필요 (email과 password만 포함)"""
    email: EmailStr
    password: str

class UserCreate(UserBase):
    """사용자 회원가입 시 필요 (password 포함)"""
    password: str

# 기존 User 스키마 (친구 검색 결과 등에서 사용)
class User(BaseModel):
    id: int
    email: EmailStr
    username: Optional[str] = None
    friend_code: Optional[str] = None
    is_online: Optional[bool] = False
    
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


# 🚨 새 스키마: 친구 요청 (POST 요청 본문)
class FriendRequest(BaseModel):
    friend_code: str # 친구 코드를 통해 요청 대상을 지정

# 🚨 수정됨: 필드명을 DB 모델(Friendship)과 동일하게 user_id와 friend_id로 변경
class FriendshipBase(BaseModel):
    user_id: int # 요청을 보낸 사용자 ID (requester)
    friend_id: int # 요청을 받은 사용자 ID (receiver)
    status: str = "pending" # 초기 상태: pending, accepted
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# 🚨 새 스키마: 알림 페이지에 보낼 친구 요청 정보
class FriendNotification(BaseModel):
    id: int # Friendship 레코드 ID (수락/거절 시 사용)
    sender_id: int # 요청을 보낸 사람 ID
    sender_name: Optional[str] # 요청을 보낸 사람 이름
    sender_friend_code: str # 요청을 보낸 사람의 친구 코드
    status: str # 현재 상태 (pending)

    class Config:
        from_attributes = True

# 🚨 새 스키마: 친구 요청 수락/거절을 위한 POST 요청
class FriendAction(BaseModel):
    friendship_id: int # Friendship 테이블의 ID
    action: str # "accept" 또는 "reject"
    
# --- 메모 스키마 ---
class MemoBase(BaseModel):
# ... (이하 메모, 프로젝트, 채팅, 마인드맵 스키마는 변경 없음)
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
