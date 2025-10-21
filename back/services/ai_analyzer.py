from typing import List, Dict, Any
from ..schemas import ChatMessage, AIAnalysisResult, MindMapData, MindMapNodeBase
import json

# Node 및 Link 구조를 만들기 위한 헬퍼 함수
def create_node(id: str, type: str, title: str, desc: str, connections: List[str] = None) -> Dict[str, Any]:
    return MindMapNodeBase(
        id=id,
        node_type=type,
        title=title,
        description=desc,
        connections=[{"target_id": tid} for tid in (connections or [])]
    ).dict()

def create_link(source: str, target: str) -> Dict[str, str]:
    return {"source": source, "target": target}

def analyze_chat_and_generate_map_mock(chat_history: List[ChatMessage]) -> AIAnalysisResult:
    """
    채팅 기록을 분석하여 마인드맵 구조를 생성하는 AI 목업 함수.
    
    실제 구현 시:
    1. chat_history를 텍스트로 가공합니다.
    2. Gemini API를 호출하여 핵심 주제, 대주제, 소주제, 연관 관계를 JSON 형식으로 요청합니다.
    3. LLM 응답을 파싱하여 MindMapData 스키마에 맞춥니다.
    """
    if not chat_history:
        return AIAnalysisResult(
            is_success=False,
            last_chat_id=0,
            mind_map_data=MindMapData(nodes=[], links=[])
        )

    # 마지막 채팅 ID
    last_chat_id = chat_history[-1].id
    
    # === 목업 데이터 생성: 핵심 주제 1개, 대주제 3개, 소주제 4개 ===
    
    nodes = []
    links = []

    # 1. 핵심 주제 (최대 3개)
    nodes.append(create_node("core-1", "핵심 주제", "협업 도구 개발 목표", "팀 프로젝트의 최종 방향성 논의", ["major-1", "major-2", "major-3"]))

    # 2. 대주제 (최대 10개)
    nodes.append(create_node("major-1", "대주제", "FastAPI 백엔드", "성능과 API 설계 중심"))
    nodes.append(create_node("major-2", "대주제", "React 프론트엔드", "UI/UX 및 상태 관리"))
    nodes.append(create_node("major-3", "대주제", "AI 요약 기능", "채팅 분석 및 구조화"))

    # 3. 소주제 (최대 30개)
    nodes.append(create_node("minor-1-1", "소주제", "DB 모델링", "SQLAlchemy ORM 사용"))
    nodes.append(create_node("minor-1-2", "소주제", "비동기 처리", "FastAPI의 장점 활용"))
    nodes.append(create_node("minor-2-1", "소주제", "컴포넌트 설계", "재사용 가능한 UI 컴포넌트"))
    nodes.append(create_node("minor-3-1", "소주제", "프롬프트 엔지니어링", "AI 분석의 정확도 향상 방안"))

    # 4. 연결 관계 정의 (프론트엔드가 요소 생성 후 선을 그릴 수 있도록 정보 제공)
    links.append(create_link("core-1", "major-1"))
    links.append(create_link("core-1", "major-2"))
    links.append(create_link("core-1", "major-3"))
    links.append(create_link("major-1", "minor-1-1"))
    links.append(create_link("major-1", "minor-1-2"))
    links.append(create_link("major-2", "minor-2-1"))
    links.append(create_link("major-3", "minor-3-1"))

    # --- 최종 스키마에 맞게 응답 생성 ---
    mind_map_data = MindMapData(
        nodes=nodes,
        links=links
    )

    return AIAnalysisResult(
        is_success=True,
        last_chat_id=last_chat_id,
        mind_map_data=mind_map_data
    )

def analyze_chat_and_generate_map(
    project_id: int, 
    chat_history: List[ChatMessage], 
    last_processed_chat_id: int,
    db_session: Any
) -> AIAnalysisResult:
    """
    실제 AI 분석을 수행하고, 이전에 정리된 내용을 고려하는 함수입니다.
    
    last_processed_chat_id: 이전에 AI가 마지막으로 분석한 채팅 메시지 ID. 
                            이후 메시지만 AI에게 전달하여 효율성을 높입니다.
    """
    
    # 1. 이전 정리 내용 가져오기 (이전 노드/링크 정보)
    # 실제 구현 시: db_session을 통해 MindMapNode 테이블에서 project_id에 해당하는
    # 기존 노드 정보를 가져와서 AI 분석 프롬프트에 '이전 요약 정보'로 포함해야 합니다.
    
    # 2. 새로 분석할 채팅 기록 필터링
    new_chat_history = [chat for chat in chat_history if chat.id > last_processed_chat_id]

    if not new_chat_history:
        # 새로 분석할 내용이 없으면 기존 맵 정보를 반환하거나 실패를 알림.
        print("새로 분석할 채팅이 없습니다.")
        return AIAnalysisResult(
            is_success=True,
            last_chat_id=last_processed_chat_id,
            mind_map_data=MindMapData(nodes=[], links=[]) # 변경 사항 없음
        )

    # 3. 신규 채팅 내용을 텍스트로 조합
    new_chat_text = "\n".join([f"[{chat.user_id}] {chat.content}" for chat in new_chat_history])
    
    # 4. (목업 실행) 실제로는 LLM API 호출 및 응답 파싱
    mock_result = analyze_chat_and_generate_map_mock(new_chat_history)
    
    return mock_result


def recommend_map_improvements_mock(map_data: Dict[str, Any], chat_history: List[ChatMessage]) -> str:
    """
    마인드맵을 기반으로 개선 사항을 추천하는 AI 목업 함수. (500자 이내)
    """
    # 노드 개수 기반 간단한 분석
    num_nodes = len(map_data.get('nodes', []))
    
    if num_nodes < 5:
        recommendation = "현재 마인드맵의 구조가 단순합니다. 채팅 기록을 다시 확인하여 '기술 스택 결정'과 관련된 새로운 '대주제'를 추가하는 것을 고려해 보세요. 예를 들어, '비용 효율성'을 소주제로 추가하여 논의의 깊이를 더할 수 있습니다."
    elif num_nodes > 10:
        recommendation = "현재 대주제가 너무 많아 보입니다. 'FastAPI 백엔드'와 'Docker 배포' 주제를 '인프라 및 기술 스택'이라는 하나의 핵심 주제로 통합하여 마인드맵의 가독성을 높이는 것을 추천합니다."
    else:
        recommendation = "현재 마인드맵은 균형 잡힌 구조를 가지고 있으며, 채팅 기록의 핵심 내용을 잘 반영하고 있습니다. 다음 단계로, 각 소주제에 대한 구체적인 작업 할당(Task Assignment)을 논의하는 것을 추천합니다."

    return recommendation[:500] # 500자 이내로 제한
