from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from sqlalchemy.exc import IntegrityError # DB 무결성 오류 처리를 위해 추가

# ORM 모델 임포트 시 별칭(Alias) 사용: 충돌 해결
from ..models import (
    Project as ORMProject, 
    ProjectMember as ORMProjectMember, 
    ChatMessage as ORMChatMessage, 
    MindMapNode as ORMDatabaseMindMapNode, # ORM 클래스 이름 변경: Pydantic 스키마와 충돌 방지
    User as ORMUser
)
from ..schemas import (
    Project as ProjectSchema, 
    ProjectCreate, 
    ChatMessage as ChatMessageSchema, 
    ChatMessageCreate, 
    AIAnalysisResult, 
    MindMapNodeBase, 
    MindMapData, 
    AIRecommendation, 
    ProjectUpdate,
    ORMMindMapNode # Pydantic response model alias 임포트 (schemas.py에서 정의됨)
)
from ..security import get_current_active_user
from ..services.ai_analyzer import analyze_chat_and_generate_map, recommend_map_improvements
from typing import List
from sqlalchemy.orm import joinedload

router = APIRouter()

# 헬퍼 함수: 멤버 검증
def verify_project_member(db: Session, project_id: int, user_id: int):
    """사용자가 프로젝트 멤버인지 확인하고, 아니면 403 에러 발생"""
    is_member = db.query(ORMProjectMember).filter(
        ORMProjectMember.project_id == project_id,
        ORMProjectMember.user_id == user_id
    ).first()
    if not is_member:
        # 프로젝트가 존재하지 않는 경우는 아래 라우터에서 먼저 처리됩니다.
        raise HTTPException(status_code=403, detail="Not a member of this project")
    return True

# --- 프로젝트 CRUD ---
@router.post("/", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """새 협업 프로젝트 생성"""
    db_project = ORMProject(title=project_data.title)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
        
    # 생성자를 멤버 및 관리자로 추가
    db_member = ORMProjectMember(project_id=db_project.id, user_id=current_user.id, is_admin=True)
    db.add(db_member)
    db.commit()
        
    # 생성 후 프로젝트 멤버 정보까지 로드하여 반환
    return db.query(ORMProject).options(joinedload(ORMProject.members).joinedload(ORMProjectMember.user)).filter(ORMProject.id == db_project.id).first()

@router.get("/", response_model=List[ProjectSchema])
def list_projects(
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """현재 사용자가 멤버로 참여하고 있는 모든 프로젝트 목록 조회 (멤버 정보 포함)"""
    projects = db.query(ORMProject).join(ORMProjectMember).filter(
        ORMProjectMember.user_id == current_user.id
    ).order_by(desc(ORMProject.created_at)).options(
        joinedload(ORMProject.members).joinedload(ORMProjectMember.user)
    ).all()
        
    return projects

@router.get("/{project_id}", response_model=ProjectSchema)
def get_project_details(
    project_id: int,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """특정 프로젝트 상세 정보 조회 (멤버 검증 포함)"""
    verify_project_member(db, project_id, current_user.id)
        
    project = db.query(ORMProject).filter(ORMProject.id == project_id).options(
        joinedload(ORMProject.members).joinedload(ORMProjectMember.user)
    ).first()
        
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    return project

@router.put("/{project_id}", response_model=ProjectSchema)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """프로젝트 정보 수정 (제목)"""
    verify_project_member(db, project_id, current_user.id)

    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_update.title is not None:
        db_project.title = project_update.title
        
    db.commit()
    db.refresh(db_project)
        
    return db.query(ORMProject).options(joinedload(ORMProject.members).joinedload(ORMProjectMember.user)).filter(ORMProject.id == project_id).first()

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """프로젝트 삭제 (프로젝트 관리자만 가능하다고 가정)"""
    is_admin = db.query(ORMProjectMember).filter(
        ORMProjectMember.project_id == project_id,
        ORMProjectMember.user_id == current_user.id,
        ORMProjectMember.is_admin == True
    ).first()

    if not is_admin:
        raise HTTPException(status_code=403, detail="Only project admins can delete the project")

    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.query(ORMChatMessage).filter(ORMChatMessage.project_id == project_id).delete()
    db.query(ORMDatabaseMindMapNode).filter(ORMDatabaseMindMapNode.project_id == project_id).delete()
    db.query(ORMProjectMember).filter(ORMProjectMember.project_id == project_id).delete()
        
    db.delete(db_project)
    db.commit()
        
    return

# --- 채팅 기능 ---
@router.post("/{project_id}/chat", response_model=ChatMessageSchema, status_code=status.HTTP_201_CREATED)
def post_chat_message(
    project_id: int,
    message: ChatMessageCreate,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    프로젝트 채팅 메시지 전송. 
    프로젝트가 없을 경우 (FK 오류 방지를 위해) 자동으로 프로젝트를 생성합니다.
    """
    
    # 1. 프로젝트 존재 여부 확인 및 자동 생성 로직
    # 인증 비활성화 환경에서 project_id=1 등의 프로젝트가 없을 때 발생했던 오류를 해결
    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    user_id = current_user.id

    if not db_project:
        print(f"INFO: Project ID {project_id} not found. Attempting auto-creation.")
        try:
            # 1-1. 프로젝트 생성 (로그에 표시된 ID 사용)
            new_project = ORMProject(id=project_id, title=f"Auto-Created Project {project_id}")
            db.add(new_project)
            db.flush() # ID를 수동으로 지정했기 때문에 먼저 플러시하여 DB에 존재하도록 시도
            
            # 1-2. 사용자(혹은 임시 사용자)를 멤버로 추가 (verify_project_member 통과 목적)
            db_member = ORMProjectMember(project_id=project_id, user_id=user_id, is_admin=True)
            db.add(db_member)
            
            db.commit()
            print(f"INFO: Successfully created missing Project and added member for ID: {project_id}")
            
        except IntegrityError as e:
            # Race condition 등으로 이미 프로젝트가 생성되었거나, 
            # user_id가 유효하지 않는 등의 다른 Integrity Error 발생 시 롤백
            db.rollback()
            # 다시 한 번 프로젝트 존재 여부를 확인 (다른 요청이 그 사이에 생성했을 수 있음)
            db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
            if not db_project:
                # 여전히 없다면 심각한 오류로 간주하고 500 에러 반환
                print(f"ERROR: Fatal error during Project creation for ID {project_id}. {e}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Database integrity error (FK or User/Project missing): {e}"
                )
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Unexpected error during project auto-creation: {e}")

    # 2. 프로젝트 멤버 검증 (기존 로직 유지)
    # 자동 생성 로직 덕분에 이제 이 검증은 통과될 가능성이 높아집니다.
    verify_project_member(db, project_id, user_id)
        
    # 3. 채팅 메시지 저장 (기존 로직 유지)
    db_message = ORMChatMessage(
        project_id=project_id,
        user_id=user_id,
        content=message.content
    )
    db.add(db_message)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # 메시지 삽입 중 발생 가능한 다른 DB 오류 처리
        raise HTTPException(
            status_code=500, 
            detail=f"Database error during message commit: {e}"
        )
        
    db.refresh(db_message)
    return db_message

@router.get("/{project_id}/chat", response_model=List[ChatMessageSchema])
def get_chat_history(
    project_id: int,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """프로젝트 채팅 기록 조회"""
    verify_project_member(db, project_id, current_user.id)
        
    chats = db.query(ORMChatMessage).filter(ORMChatMessage.project_id == project_id).order_by(ORMChatMessage.timestamp).all()
    return chats

# --- 핵심 기능: AI 분석 및 마인드맵 생성 ---
@router.post("/{project_id}/generate", response_model=AIAnalysisResult)
def generate_mindmap(
    project_id: int,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """채팅 기록을 기반으로 AI 마인드맵 생성/업데이트 요청"""
    verify_project_member(db, project_id, current_user.id)

    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    if db_project.is_generating:
        raise HTTPException(status_code=409, detail="MindMap is already being generated.")

    db_project.is_generating = True
    db.commit()
        
    chat_history = db.query(ORMChatMessage).filter(ORMChatMessage.project_id == project_id).order_by(ORMChatMessage.id).all()
        
    try:
        analysis_result = analyze_chat_and_generate_map(
            project_id=project_id,
            chat_history=chat_history,
            last_processed_chat_id=db_project.last_chat_id_processed,
            db_session=db
        )
    except Exception as e:
        db_project.is_generating = False
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {e}")

    if analysis_result.is_success:
        # 기존 노드 삭제 시 ORM 모델명 변경 적용
        db.query(ORMDatabaseMindMapNode).filter(ORMDatabaseMindMapNode.project_id == project_id).delete()
        
        new_nodes = []
        for node_data in analysis_result.mind_map_data.nodes:
            # ORM 모델명 변경 적용
            new_node = ORMDatabaseMindMapNode(
                id=node_data.id,
                project_id=project_id,
                node_type=node_data.node_type,
                title=node_data.title,
                description=node_data.description,
                connections=[c.model_dump() for c in node_data.connections]
            )
            new_nodes.append(new_node)
        db.add_all(new_nodes)

        db_project.last_chat_id_processed = analysis_result.last_chat_id
        db_project.is_generating = False
        db.commit()
    else:
        db_project.is_generating = False
        db.commit()
        raise HTTPException(status_code=500, detail="AI analysis failed to process the chat history.")
        
    return analysis_result

@router.get("/{project_id}/mindmap", response_model=List[ORMMindMapNode]) # Pydantic 모델을 response_model로 사용
def get_mindmap_nodes(
    project_id: int,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """현재 마인드맵 노드 전체 조회"""
    verify_project_member(db, project_id, current_user.id)
        
    # 데이터베이스 쿼리에는 ORM 클래스를 사용
    nodes = db.query(ORMDatabaseMindMapNode).filter(ORMDatabaseMindMapNode.project_id == project_id).all()
    return nodes

@router.put("/{project_id}/node/{node_id}", response_model=ORMMindMapNode) # Pydantic 모델을 response_model로 사용
def update_mindmap_node(
    project_id: int,
    node_id: str,
    node_update: MindMapNodeBase,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """마인드맵 노드 상세 정보 수정 (title, description)"""
    verify_project_member(db, project_id, current_user.id)
        
    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project or db_project.is_generating:
        raise HTTPException(status_code=403, detail="Cannot modify node while map is generating.")
        
    # 데이터베이스 쿼리에는 ORM 클래스를 사용
    db_node = db.query(ORMDatabaseMindMapNode).filter(
        ORMDatabaseMindMapNode.project_id == project_id,
        ORMDatabaseMindMapNode.id == node_id
    ).first()
        
    if not db_node:
        raise HTTPException(status_code=404, detail="MindMap Node not found")

    # 데이터베이스 쿼리에는 ORM 클래스를 사용
    if not db.query(ORMDatabaseMindMapNode).filter(ORMDatabaseMindMapNode.project_id == project_id).first():
        raise HTTPException(status_code=403, detail="Cannot modify a node if the MindMap has not been generated yet.")

    if node_update.description is not None:
        db_node.description = node_update.description
    if node_update.title is not None:
        db_node.title = node_update.title
        
    db.commit()
    db.refresh(db_node)
    return db_node

# --- AI 추천 기능 ---
@router.post("/{project_id}/recommend", response_model=AIRecommendation)
def get_ai_recommendation(
    project_id: int,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """마인드맵 기반 AI 개선 추천 (500자 이내)"""
    verify_project_member(db, project_id, current_user.id)

    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # 데이터베이스 쿼리에는 ORM 클래스를 사용
    nodes = db.query(ORMDatabaseMindMapNode).filter(ORMDatabaseMindMapNode.project_id == project_id).all()
    if not nodes:
        raise HTTPException(status_code=400, detail="MindMap has not been generated yet. Cannot provide recommendation.")

    chat_history = db.query(ORMChatMessage).filter(ORMChatMessage.project_id == project_id).order_by(ORMChatMessage.id).all()
        
    # 데이터를 딕셔너리로 변환하여 AI 서비스에 전달
    map_data = {"nodes": [
        {"id": n.id, "node_type": n.node_type, "title": n.title, "description": n.description, "connections": n.connections} 
        for n in nodes
    ]}

    recommendation_text = recommend_map_improvements(map_data, chat_history)

    return AIRecommendation(recommendation=recommendation_text)