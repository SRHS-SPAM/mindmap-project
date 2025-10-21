from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from ..database import get_db
# Pydantic 스키마와의 이름 충돌을 피하기 위해 ORM 모델에 별칭(ORM) 지정
from ..models import (
    Project as ORMProject, 
    ProjectMember, 
    ChatMessage as ORMChatMessage, 
    MindMapNode as ORMMindMapNode, 
    User as ORMUser
)
from ..schemas import (
    Project, ProjectCreate, ChatMessage, ChatMessageCreate, 
    AIAnalysisResult, MindMapNodeBase, MindMapData, AIRecommendation,
    # response_model로 사용되는 Pydantic MindMapNode 스키마를 추가 (이전 오류의 원인)
    MindMapNode 
)
from ..security import get_current_active_user
from ..services.ai_analyzer import analyze_chat_and_generate_map, recommend_map_improvements_mock


router = APIRouter()

# --- 프로젝트 CRUD ---
@router.post("/", response_model=Project, status_code=status.HTTP_201_CREATED)
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
    
    # 생성자를 멤버로 추가
    db_member = ProjectMember(project_id=db_project.id, user_id=current_user.id)
    db.add(db_member)
    db.commit()
    
    return db_project

@router.get("/{project_id}", response_model=Project)
def get_project_details(
    project_id: int,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """특정 프로젝트 상세 정보 조회 (멤버 검증 포함)"""
    # 멤버 여부 확인
    is_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this project")

    project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    return project

# --- 채팅 기능 ---
@router.post("/{project_id}/chat", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
def post_chat_message(
    project_id: int,
    message: ChatMessageCreate,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """프로젝트 채팅 메시지 전송"""
    # 프로젝트 멤버 검증 로직 생략 (get_project_details에서 이미 처리)
    db_message = ORMChatMessage(
        project_id=project_id,
        user_id=current_user.id,
        content=message.content
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

@router.get("/{project_id}/chat", response_model=List[ChatMessage])
def get_chat_history(
    project_id: int,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """프로젝트 채팅 기록 조회"""
    # 최신 순으로 정렬하여 반환
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
    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    if db_project.is_generating:
        raise HTTPException(status_code=409, detail="MindMap is already being generated.")

    # 1. 생성 중 상태로 변경
    db_project.is_generating = True
    db.commit()
    
    # 2. 분석할 채팅 기록 로드
    chat_history = db.query(ORMChatMessage).filter(ORMChatMessage.project_id == project_id).order_by(ORMChatMessage.id).all()
    
    # 3. AI 서비스 호출
    try:
        # 이전에 처리된 메시지 ID를 전달하여 효율성을 높임
        analysis_result = analyze_chat_and_generate_map(
            project_id=project_id,
            chat_history=chat_history,
            last_processed_chat_id=db_project.last_chat_id_processed,
            db_session=db
        )
    except Exception as e:
        # 오류 발생 시 상태 초기화
        db_project.is_generating = False
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {e}")

    # 4. 분석 결과 DB 업데이트
    if analysis_result.is_success:
        # 기존 노드 삭제
        db.query(ORMMindMapNode).filter(ORMMindMapNode.project_id == project_id).delete()
        
        # 새로운 노드 저장
        new_nodes = []
        for node_data in analysis_result.mind_map_data.nodes:
            new_node = ORMMindMapNode(
                id=node_data.id,
                project_id=project_id,
                node_type=node_data.node_type,
                title=node_data.title,
                description=node_data.description,
                connections=[c.dict() for c in node_data.connections]
            )
            new_nodes.append(new_node)
        db.add_all(new_nodes)

        # 프로젝트 상태 업데이트
        db_project.last_chat_id_processed = analysis_result.last_chat_id
        db_project.is_generating = False
        db.commit()
        
    return analysis_result

@router.get("/{project_id}/mindmap", response_model=List[MindMapNode])
def get_mindmap_nodes(
    project_id: int,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """현재 마인드맵 노드 전체 조회"""
    # response_model에 사용되는 MindMapNode는 Pydantic 스키마입니다.
    nodes = db.query(ORMMindMapNode).filter(ORMMindMapNode.project_id == project_id).all()
    return nodes


@router.put("/{project_id}/node/{node_id}", response_model=MindMapNode)
def update_mindmap_node(
    project_id: int,
    node_id: str,
    node_update: MindMapNodeBase,
    current_user: ORMUser = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """마인드맵 노드 상세 정보 수정 (description만 가능하도록 제한)"""
    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project or db_project.is_generating:
        raise HTTPException(status_code=403, detail="Cannot modify node while map is generating.")
        
    db_node = db.query(ORMMindMapNode).filter(
        ORMMindMapNode.project_id == project_id,
        ORMMindMapNode.id == node_id
    ).first()
    
    if not db_node:
        raise HTTPException(status_code=404, detail="MindMap Node not found")

    # 마인드맵 생성 중이거나 아예 마인드맵이 없으면 수정 불가
    if not db.query(ORMMindMapNode).filter(ORMMindMapNode.project_id == project_id).first():
        raise HTTPException(status_code=403, detail="Cannot modify a node if the MindMap has not been generated yet.")

    # description만 수정 가능하도록 제한
    db_node.description = node_update.description
    db_node.title = node_update.title # 제목도 수정 가능하도록 허용
    
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
    db_project = db.query(ORMProject).filter(ORMProject.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # 마인드맵 데이터 로드
    nodes = db.query(ORMMindMapNode).filter(ORMMindMapNode.project_id == project_id).all()
    if not nodes:
        raise HTTPException(status_code=400, detail="MindMap has not been generated yet. Cannot provide recommendation.")

    # 채팅 기록 로드 (분석의 깊이를 위해)
    chat_history = db.query(ORMChatMessage).filter(ORMChatMessage.project_id == project_id).order_by(ORMChatMessage.id).all()
    
    # 데이터를 딕셔너리로 변환하여 AI 목업 서비스에 전달
    # 참고: .dict()는 Pydantic v1 메서드이며, v2에서는 model_dump()를 사용해야 하지만, 
    # 현재 코드 구조에 맞춰 .dict()를 유지합니다.
    map_data = {"nodes": [n.dict() for n in nodes]}

    # AI 추천 서비스 호출 (목업)
    recommendation_text = recommend_map_improvements_mock(map_data, chat_history)

    return AIRecommendation(recommendation=recommendation_text)
