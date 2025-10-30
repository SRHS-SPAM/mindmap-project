from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
# Pydantic 스키마와의 이름 충돌을 피하기 위해 ORM 모델에 별칭(ORM) 지정
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
# 💡 [가정] services.ai_analyzer 모듈 임포트
from ..services.ai_analyzer import analyze_chat_and_generate_map, recommend_map_improvements
from typing import List, Optional
from sqlalchemy.orm import joinedload
from pydantic import ValidationError # 추가^^

# ----------------------------------------------------
# 💡 핵심 1: 멤버십 서비스/유틸리티 함수 (403 오류 해결의 핵심)
# ----------------------------------------------------
def get_project_member(db: Session, user_id: int, project_id: int) -> Optional[ORMProjectMember]:
    """특정 프로젝트에서 사용자의 멤버십 정보를 조회합니다."""
    return db.query(ORMProjectMember).filter(
        ORMProjectMember.project_id == project_id,
        ORMProjectMember.user_id == user_id
    ).first()

def verify_project_member_dependency(
    project_id: int, 
    db: Session = Depends(get_db), 
    current_user: ORMUser = Depends(get_current_active_user)
) -> ORMProjectMember:
    """FastAPI Depends로 사용하여 권한이 없으면 403을 발생시킵니다."""
    member = get_project_member(db, current_user.id, project_id)
    
    if not member:
        # 🚨 프론트엔드에서 발생했던 403 오류를 여기서 처리합니다.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="User is not a member of this project."
        )
    return member # 멤버 ORM 객체 반환

# ----------------------------------------------------
# 💡 [라우터 정의]
# ----------------------------------------------------
router = APIRouter(
    prefix="/projects",
    tags=["4. Project and MindMap"]
)

# --- 프로젝트 CRUD ---

# (기존 create_project, list_projects, get_project_details, update_project, delete_project 함수는
#  단순히 verify_project_member를 호출하던 방식이었으므로, 기존 코드를 유지하고
#  verify_project_member_dependency를 활용하도록 수정하지 않았습니다.
#  기존 코드의 verify_project_member를 제거하고 상단의 get_project_member를 사용하도록 정의합니다.)

# 💡 [수정] 기존 코드에서 사용된 임시 멤버 검증 함수를 상단의 get_project_member를 사용하여 재정의합니다.
def verify_project_member(db: Session, project_id: int, user_id: int):
    member = get_project_member(db, user_id, project_id)
    if not member:
        raise HTTPException(
            status_code=403, 
            detail="User is not a member of this project."
        )


# 임시 멤버 검증 함수 (제공된 코드에 없어서 임시로 정의)
def verify_project_member(db: Session, project_id: int, user_id: int):
    member = db.query(ORMProjectMember).filter(
        ORMProjectMember.project_id == project_id,
        ORMProjectMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(
            status_code=403, 
            detail="User is not a member of this project."
        )

# 💡 [수정] 라우터에 prefix를 추가했습니다. (main.py에서 /api/v1을 포함한다고 가정)
router = APIRouter(
    prefix="/projects",
    tags=["4. Project and MindMap"]
)

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

    # 관련 데이터 삭제 (채팅, 노드, 멤버)
    db.query(ORMChatMessage).filter(ORMChatMessage.project_id == project_id).delete(synchronize_session=False)
    db.query(ORMDatabaseMindMapNode).filter(ORMDatabaseMindMapNode.project_id == project_id).delete(synchronize_session=False)
    db.query(ORMProjectMember).filter(ORMProjectMember.project_id == project_id).delete(synchronize_session=False)
        
    db.delete(db_project)
    db.commit()
        
    return

# --- 채팅 기능 ---
@router.post("/{project_id}/chat", response_model=ChatMessageSchema, status_code=status.HTTP_201_CREATED)
def post_chat_message( # 함수 이름 명확화 (generate_mindmap과의 충돌 방지)
    project_id: int,
    # 💡 Pydantic 스키마를 인수로 받도록 명확히 정의
    message_data: ChatMessageCreate, 
    # 💡 403 권한 검사를 Depends에 위임
    member: ORMProjectMember = Depends(verify_project_member_dependency), 
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """프로젝트 채팅 메시지 전송"""
    
    user_id = current_user.id 
    
    # 2. 프로젝트 존재 여부 확인 및 기본 프로젝트 자동 생성
    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()

    if not db_project:
        # DB 무결성 오류 해결을 위해 프로젝트가 없으면 기본 프로젝트를 생성합니다.
        try:
            db_project = ORMProject(id=project_id, title=f"임시 프로젝트 {project_id}")
            db.add(db_project)
            db.commit()
            db.refresh(db_project)
            
            # 프로젝트 멤버도 함께 생성
            db_member = ORMProjectMember(project_id=project_id, user_id=user_id, is_admin=True)
            db.add(db_member)
            db.commit()
            
            print(f"INFO: Created default project (ID: {project_id}) and member (User ID: {user_id}).")
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=400, 
                detail=f"Project {project_id} not found and failed to create default project. Detail: {e}"
            )

    # 3. 채팅 메시지 저장
    db_message = ORMChatMessage(
        project_id=project_id,
        user_id=current_user.id, # current_user에서 user_id 가져옴
        # 💡 Pydantic 객체(message_data)에서 content를 가져와야 합니다.
        content=message_data.content 
    )
    db.add(db_message)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
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
    # 프로젝트 존재 여부 확인
    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    chats = db.query(ORMChatMessage).filter(ORMChatMessage.project_id == project_id).order_by(ORMChatMessage.timestamp).all()
    return chats

# --- 핵심 기능: AI 분석 및 마인드맵 생성 ---
@router.post("/{project_id}/generate", response_model=AIAnalysisResult)
def generate_mindmap(
    project_id: int,
    # 💡 [핵심 통합] 403 권한 검사를 Depends에 위임합니다.
    member: ORMProjectMember = Depends(verify_project_member_dependency), 
    current_user: ORMUser = Depends(get_current_active_user), # 토큰 검증은 여기서 이미 처리됨
    db: Session = Depends(get_db)
):
    """채팅 기록을 기반으로 AI 마인드맵 생성/업데이트 요청"""
    # 💡 [디버깅 추가] DB 연결 및 ORM 모델 접근 테스트
    try:
        # ORM 테스트: 프로젝트 ID {project_id}의 노드가 있는지 확인
        # ORMDatabaseMindMapNode는 이 파일 상단에서 ORMMindMapNode의 별칭입니다.
        test_node_count = db.query(ORMDatabaseMindMapNode).filter(
            ORMDatabaseMindMapNode.project_id == project_id
        ).count()
        print(f"✅ DEBUG ROUTER: DB ORM 테스트 성공. Project {project_id}의 노드 개수: {test_node_count}")

    except Exception as e:
        # 이 예외가 발생하면 DB 설정 문제
        print(f"🚨🚨🚨 FATAL DB ERROR IN ROUTER (generate_mindmap): {e} 🚨🚨🚨")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database connection or ORM query failed: {e}"
        )
    
    # ----------------------------------------------------------------------

    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project:
        # verify_project_member_dependency를 통과했다면 발생 가능성이 낮지만, 안전을 위해 남겨둠
        raise HTTPException(status_code=404, detail="Project not found")

    if db_project.is_generating:
        raise HTTPException(status_code=409, detail="MindMap is already being generated.")
    
    # 💡 [AI 생성 중] 플래그 설정
    db_project.is_generating = True
    db.commit()
        
    chat_history = db.query(ORMChatMessage).filter(ORMChatMessage.project_id == project_id).order_by(ORMChatMessage.id).all()

    # 🚨🚨🚨 디버깅 코드 추가 (필수) 🚨🚨🚨
    print("-----------------------------------------")
    print(f"✅✅ [DEBUG ROUTER] Project ID: {project_id}")
    print(f"🚨🚨 [ROUTER LOG] chat_history length BEFORE AI call: {len(chat_history)}")
    if len(chat_history) > 0:
        print(f"🚨🚨 [ROUTER LOG] First Chat ID: {chat_history[0].id}, Content: {chat_history[0].content[:20]}...")
    print("-----------------------------------------")
    # 🚨🚨🚨 디버깅 코드 끝 🚨🚨🚨
    
    try:
        last_processed_id = db_project.last_chat_id_processed or 0
        
        # last_processed_id = 0 
    
        # 💡 analyze_chat_and_generate_map 호출 (DB 세션 전달)
        analysis_result: AIAnalysisResult = analyze_chat_and_generate_map(
            project_id=project_id,
            chat_history=chat_history,
            last_processed_chat_id=last_processed_id, # ⬅️ 이제 0이 전달됨
            db_session=db
        )
        
        # 분석이 성공하고 유효한 데이터가 있을 때만 노드 업데이트
        if analysis_result.is_success and analysis_result.mind_map_data and analysis_result.mind_map_data.nodes:
            # 1. 기존 노드 삭제
            db.query(ORMDatabaseMindMapNode).filter(ORMDatabaseMindMapNode.project_id == project_id).delete(synchronize_session=False)
            
            # 2. 새로운 노드 ORM 객체 생성 및 추가
            new_nodes = []
            for node_data in analysis_result.mind_map_data.nodes:
                # 🚨 connections 필드가 JSON 컬럼임을 가정하고 Pydantic 객체를 to_dict() 또는 json.dumps로 변환해야 할 수 있습니다.
                # 현재는 스키마/모델의 타입이 직접적으로 일치한다고 가정하고 처리합니다.
                db_node = ORMDatabaseMindMapNode(
                    project_id=project_id,
                    id=node_data.id,
                    node_type=node_data.node_type,
                    title=node_data.title,
                    description=node_data.description,
                    connections=node_data.connections 
                )
                new_nodes.append(db_node)

            db.add_all(new_nodes) 
            
            # 3. 프로젝트 상태 업데이트
            db_project.last_chat_id_processed = analysis_result.last_chat_id
            db_project.is_generating = False
            db.commit()

            # [수정] 아래 줄에 디버깅 코드 추가
            chat_history = db.query(ORMChatMessage).filter(ORMChatMessage.project_id == project_id).order_by(ORMChatMessage.id).all()

            # 🚨🚨🚨 디버깅 코드 추가 🚨🚨🚨
            print(f"🚨🚨 [ROUTER LOG] chat_history length before AI call: {len(chat_history)}")
            # 🚨🚨🚨 디버깅 코드 끝 🚨🚨🚨
        else:
            # 💡 [핵심 수정] AI 분석이 성공했으나 (is_success=True), 새로운 노드를 생성할 필요가 없거나 (채팅 없음) 
            # 마인드맵 데이터를 반환하지 않은 경우입니다.
            
            # 🚨 [수정] is_success가 False인 경우에만 400 에러를 발생시키고, 
            # is_success가 True인 경우는 정상 종료로 간주하여 200 OK를 반환하도록 수정합니다.
            
            db_project.is_generating = False
            db.commit()

            if not analysis_result.is_success:
                # AI 분석 함수에서 실패(예: LLM 오류, 파싱 오류)를 명시적으로 반환한 경우
                raise HTTPException(status_code=400, detail="AI analysis failed (is_success=False). Check server logs for detail.")
            
            # 새로운 채팅이 없어서 노드 업데이트를 하지 않은 경우 (analysis_result.nodes=[]), 정상 응답으로 간주합니다.
            return analysis_result
                
    except ValidationError as e:
        # Pydantic 스키마(AIAnalysisResult) 파싱 오류 처리
        db.rollback()
        db_project.is_generating = False
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"AI response validation error. Check AI output format. Detail: {e}"
        )
    except Exception as e:
        # 기타 오류 발생 시 플래그 해제 및 롤백
        db.rollback()
        db_project.is_generating = False
        db.commit()
        # 💡 GCP/Vertex AI 관련 오류가 여기서 포착됩니다.
        raise HTTPException(status_code=500, detail=f"AI analysis failed due to internal error: {e}")

    return analysis_result

# --- 마인드맵 조회 및 업데이트 ---
@router.get("/{project_id}/mindmap", response_model=List[ORMMindMapNode])
def get_mindmap_nodes(
    project_id: int,
    # 💡 [핵심 통합] 403 권한 검사를 Depends에 위임합니다.
    current_user: ORMProjectMember = Depends(verify_project_member_dependency), 
    db: Session = Depends(get_db)
):
    """현재 마인드맵 노드 전체 조회"""
    verify_project_member(db, project_id, current_user.id)
        
    # 데이터베이스 쿼리에는 ORM 클래스를 사용
    nodes = db.query(ORMDatabaseMindMapNode).filter(ORMDatabaseMindMapNode.project_id == project_id).all()
    return nodes

@router.put("/{project_id}/node/{node_id}", response_model=ORMMindMapNode)
def update_mindmap_node(
    project_id: int,
    node_id: str,
    node_update: MindMapNodeBase,
    # 💡 [핵심 통합] 403 권한 검사를 Depends에 위임합니다.
    current_user: ORMProjectMember = Depends(verify_project_member_dependency), 
    db: Session = Depends(get_db)
):
    """마인드맵 노드 상세 정보 수정 (title, description)"""
    verify_project_member(db, project_id, current_user.id)
        
    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if db_project.is_generating:
        raise HTTPException(status_code=403, detail="Cannot modify node while map is generating.")
        
    # 데이터베이스 쿼리에는 ORM 클래스를 사용
    db_node = db.query(ORMDatabaseMindMapNode).filter(
        ORMDatabaseMindMapNode.project_id == project_id,
        ORMDatabaseMindMapNode.id == node_id
    ).first()
        
    if not db_node:
        raise HTTPException(status_code=404, detail="MindMap Node not found")

    # 💡 [수정] 불필요한 중복 노드 존재 여부 확인 제거
    # db_node가 이미 Not Found 에러를 처리하므로, 추가적인 검증은 필요 없습니다.

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
    # 💡 [핵심 통합] 403 권한 검사를 Depends에 위임합니다.
    current_user: ORMProjectMember = Depends(verify_project_member_dependency), 
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

    # 💡 recommend_map_improvements 호출
    recommendation_text = recommend_map_improvements(map_data, chat_history)

    return AIRecommendation(recommendation=recommendation_text)
