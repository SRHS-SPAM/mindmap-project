from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# --- 사용자 및 인증 관련 모델 ---

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # [수정] name 컬럼 추가
    name = Column(String, index=True) 
    
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    
    # 소셜 로그인 제공자 (예: 'kakao', 'google', 'naver')
    social_provider = Column(String, nullable=True) 
    
    # 온라인 상태 (친추 기능 구현을 위한 기본 필드)
    is_online = Column(Boolean, default=False)
    
    # 릴레이션 정의
    memos = relationship("Memo", back_populates="owner")
    projects = relationship("ProjectMember", back_populates="user")
    
    # 친구 관계 (간단화를 위해 양방향 관계 대신 단방향 요청만 가정)
    friends = relationship("Friendship", foreign_keys='[Friendship.user_id]', back_populates="user")
    friend_code = Column(String(7), unique=True, index=True)
    
class Friendship(Base):
    __tablename__ = "friendships"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id")) # 친구 요청을 보낸 사용자
    friend_id = Column(Integer, ForeignKey("users.id")) # 친구가 된 사용자
    created_at = Column(DateTime, default=func.now())
    
    user = relationship("User", foreign_keys=[user_id], back_populates="friends")


# --- 메모 기능 모델 ---
class Memo(Base):
    __tablename__ = "memos"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="memos")


# --- 프로젝트 및 마인드맵 모델 ---
class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    created_at = Column(DateTime, default=func.now())
    
    # 마인드맵 생성 상태 관리
    is_generating = Column(Boolean, default=False) 
    last_chat_id_processed = Column(Integer, default=0) # AI가 마지막으로 분석한 채팅 ID
    
    members = relationship("ProjectMember", back_populates="project")
    chats = relationship("ChatMessage", back_populates="project")
    nodes = relationship("MindMapNode", back_populates="project") # 현재 마인드맵 노드 목록


class ProjectMember(Base):
    __tablename__ = "project_members"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    is_admin = Column(Boolean, default=False) # 관리자 권한 추가 (models.py에는 누락되어 있었지만, project.py에서 사용되므로 추가)
    
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="projects")
    

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    timestamp = Column(DateTime, default=func.now())
    
    project = relationship("Project", back_populates="chats")
    user = relationship("User") # 채팅 작성자 정보
    
    
class MindMapNode(Base):
    __tablename__ = "mindmap_nodes"
    
    id = Column(String, primary_key=True, index=True) # 고유 ID (예: 'core-1', 'major-5')
    project_id = Column(Integer, ForeignKey("projects.id"))
    
    # 노드 속성
    node_type = Column(String) # '핵심 주제', '대주제', '소주제'
    title = Column(String)
    description = Column(Text)
    
    # 연결 정보 (JSON 형태로 저장하여 복잡한 연결 관계를 처리)
    # 예: [{"target_id": "major-1", "label": "연관성"}, ...]
    connections = Column(JSON, default=lambda: []) 

    project = relationship("Project", back_populates="nodes")
