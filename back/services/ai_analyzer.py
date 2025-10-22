import requests
import json
from typing import List, Dict, Any, Optional
from ..schemas import ChatMessage, AIAnalysisResult, MindMapData, MindMapNodeBase
# DB 세션 타입을 정의하기 위해 ORM 모델을 import합니다.
from ..models import MindMapNode as ORMMindMapNode

# Gemini API 설정
GEMINI_API_KEY = "" # 환경 변수에서 로드하거나, 빈 문자열로 유지하면 런타임에 삽입됩니다.
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent"

# Node 및 Link 구조를 만들기 위한 헬퍼 함수
def create_node(id: str, type: str, title: str, desc: str, connections: List[str] = None) -> Dict[str, Any]:
    # Pydantic 스키마를 딕셔너리로 변환하여 DB 저장이 용이하게 함
    return MindMapNodeBase(
        id=id,
        node_type=type,
        title=title,
        description=desc,
        connections=[{"target_id": tid} for tid in (connections or [])]
    ).model_dump() # Pydantic v2에서는 .dict() 대신 .model_dump() 사용

def create_link(source: str, target: str) -> Dict[str, str]:
    return {"source": source, "target": target}


# === AI 추천 기능 (실제 LLM 호출) ===
def recommend_map_improvements(map_data: Dict[str, Any], chat_history: List[ChatMessage]) -> str:
    """
    마인드맵을 기반으로 개선 사항을 추천하는 실제 AI 함수. (500자 이내)
    LLM에게 현재 맵 데이터와 채팅을 제공하고 개선 아이디어를 요청합니다.
    """
    # 1. 입력 데이터 준비
    current_map_json = json.dumps(map_data, ensure_ascii=False, indent=2)
    recent_chat_text = "\n".join([f"[{chat.user_id} - {chat.timestamp.strftime('%H:%M')}] {chat.content}" for chat in chat_history[-20:]]) # 최근 20개 메시지만 전달

    system_prompt = """
    당신은 협업 프로젝트의 진행 상황을 분석하고 마인드맵 구조에 대한 구체적인 개선 사항을 추천하는 전문 AI입니다.
    사용자들이 채팅으로 논의한 내용과 현재 마인드맵 구조를 비교하여, 다음 중 하나 이상의 관점에서 500자 이내로 간결하고 명확하게 답변해야 합니다.
    
    **주요 추천 관점:**
    1. **구조 개선:** 누락된 핵심 주제/대주제/소주제가 있는지, 노드가 너무 많거나 적은지, 불필요하게 복잡한 연결이 있는지.
    2. **논의 심화:** 채팅에서 언급되었으나 마인드맵에 반영되지 않은 중요한 후속 논의 주제(Task Assignment, 마감 기한 등)가 있는지.
    3. **정리 제안:** 모호하거나 불완전한 노드(Title, Description)를 어떻게 수정하면 좋을지.
    
    답변은 Markdown 형식의 텍스트로만 반환하고, JSON 형식이나 다른 추가적인 정보를 포함해서는 안 됩니다.
    """
    
    user_query = f"""
    현재 마인드맵 구조:\n---\n{current_map_json}\n---\n\n
    최근 채팅 기록:\n---\n{recent_chat_text}\n---\n\n
    이 두 정보를 기반으로, 프로젝트 진행 및 마인드맵 개선을 위한 구체적인 추천 사항을 500자 이내로 제시해 주세요.
    """

    payload = {
        "contents": [{"parts": [{"text": user_query}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
    }
    
    headers = {'Content-Type': 'application/json'}
    params = {'key': GEMINI_API_KEY}
    
    # 지수 백오프 로직 (3회 시도)
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(GEMINI_API_URL, headers=headers, json=payload, params=params)
            response.raise_for_status()
            
            # 2. LLM 응답 파싱
            response_data = response.json()
            recommendation_text = response_data['candidates'][0]['content']['parts'][0]['text']
            
            return recommendation_text[:500] # 500자 이내로 자르기

        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                import time
                time.sleep(2 ** attempt) # 1초, 2초 대기
                continue
            else:
                print(f"AI 추천 API 요청 오류 (최대 재시도 실패): {e}")
                return "AI 분석 서버에 문제가 발생하여 개선 추천을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요."
        except Exception as e:
            print(f"AI 추천 응답 파싱 오류: {e}")
            return "AI 추천 결과를 처리하는 중 예상치 못한 오류가 발생했습니다."
    return "AI 분석 시스템에서 알 수 없는 오류가 발생했습니다."


# === 실제 AI 분석 및 마인드맵 생성 함수 (LLM 호출 로직 복원) ===
def analyze_chat_and_generate_map(
    project_id: int, 
    chat_history: List[ChatMessage], 
    last_processed_chat_id: int,
    db_session: Any # SQLAlchemy Session
) -> AIAnalysisResult:
    """
    채팅 기록을 분석하여 Gemini API를 통해 마인드맵 구조를 생성하고 반환합니다.
    """
    # 1. 새로 분석할 채팅 기록 필터링
    new_chat_history = [chat for chat in chat_history if chat.id > (last_processed_chat_id or 0)]

    if not new_chat_history:
        print("새로 분석할 채팅이 없습니다.")
        return AIAnalysisResult(
            is_success=True,
            last_chat_id=last_processed_chat_id,
            mind_map_data=MindMapData(nodes=[], links=[]) 
        )

    # 2. 신규 채팅 내용을 텍스트로 조합
    new_chat_text = "\n".join([f"[{chat.user_id}] {chat.content}" for chat in new_chat_history])
    last_chat_id = new_chat_history[-1].id

    # 3. 기존 마인드맵 정보 로드 (프롬프트에 포함하여 맵 업데이트 요청)
    existing_nodes = db_session.query(ORMMindMapNode).filter(ORMMindMapNode.project_id == project_id).all()
    existing_map_info = "\n".join([f"- ID: {node.id}, Title: {node.title}, Description: {node.description}" for node in existing_nodes])

    system_prompt = f"""
    당신은 사용자들의 대화를 분석하여 구조화된 마인드맵(MindMap) 데이터로 변환하는 전문 AI입니다.
    기존 마인드맵 정보가 있다면 새로운 대화 내용을 추가, 수정, 또는 삭제하여 마인드맵을 업데이트해야 합니다.
    최종 결과는 반드시 JSON Schema를 준수해야 합니다.

    **마인드맵 계층 구조:**
    1. '핵심 주제' (core): 대화의 가장 중심적인 목표 또는 주제 (최대 3개)
    2. '대주제' (major): 핵심 주제를 이루는 주요 구성 요소 또는 단계 (최대 10개)
    3. '소주제' (minor): 대주제를 상세화하는 세부 항목 또는 아이디어 (최대 30개)

    **제약 조건:**
    - 노드 ID는 고유한 문자열(예: 'core-A', 'major-1', 'minor-1-a')이어야 합니다.
    - connections 필드는 노드 간의 관계를 나타내며, 반드시 존재하는 노드의 ID를 가리켜야 합니다.
    - 응답은 오직 JSON 형식이어야 합니다.

    **기존 마인드맵 정보 (업데이트 시 참고):**
    ---
    {existing_map_info or '기존 마인드맵 정보 없음.'}
    ---
    """
    
    # 4. LLM 호출 페이로드 구성 (JSON Schema 포함)
    json_schema = {
        "type": "OBJECT",
        "properties": {
            "nodes": {
                "type": "ARRAY",
                "description": "생성되거나 업데이트된 모든 마인드맵 노드 목록",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "id": {"type": "STRING", "description": "고유한 노드 ID (예: 'core-1')"},
                        "node_type": {"type": "STRING", "enum": ["핵심 주제", "대주제", "소주제"], "description": "노드의 계층 레벨"},
                        "title": {"type": "STRING", "description": "노드의 핵심 제목 (간결하게)"},
                        "description": {"type": "STRING", "description": "노드의 상세 내용 및 요약"},
                        "connections": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {"target_id": {"type": "STRING", "description": "연결될 다른 노드의 ID"}},
                                "required": ["target_id"]
                            },
                            "description": "이 노드에서 나가는 연결 목록"
                        }
                    },
                    "required": ["id", "node_type", "title", "description", "connections"]
                }
            },
            "links": {
                "type": "ARRAY",
                "description": "노드 간의 연결 정보를 담고 있지만, connections 필드에 의해 중복되므로, nodes 필드에 있는 connections 정보만 사용하여 링크를 생성해야 합니다. 이 필드는 비워둡니다.",
                "items": {"type": "OBJECT"}
            }
        },
        "required": ["nodes", "links"]
    }

    payload = {
        "contents": [{"parts": [{"text": f"새로 업데이트된 채팅 기록:\n\n{new_chat_text}"}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": json_schema
        },
    }
    
    headers = {'Content-Type': 'application/json'}
    params = {'key': GEMINI_API_KEY}
    
    # 지수 백오프 로직 (3회 시도)
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(GEMINI_API_URL, headers=headers, json=payload, params=params)
            response.raise_for_status()
            
            # 5. LLM 응답 파싱
            response_data = response.json()
            
            json_string = response_data['candidates'][0]['content']['parts'][0]['text']
            map_json = json.loads(json_string)

            mind_map_data = MindMapData(
                nodes=map_json.get('nodes', []),
                links=map_json.get('links', [])
            )
            
            return AIAnalysisResult(
                is_success=True,
                last_chat_id=last_chat_id,
                mind_map_data=mind_map_data
            )

        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                import time
                time.sleep(2 ** attempt) # 1초, 2초 대기
                continue
            else:
                print(f"API 요청 오류 (최대 재시도 실패): {e}")
                return AIAnalysisResult(is_success=False, last_chat_id=last_chat_id, mind_map_data=MindMapData(nodes=[], links=[]))
        except (json.JSONDecodeError, KeyError) as e:
            print(f"응답 파싱 오류 또는 예상치 못한 응답 구조: {e}")
            return AIAnalysisResult(is_success=False, last_chat_id=last_chat_id, mind_map_data=MindMapData(nodes=[], links=[]))
    return AIAnalysisResult(is_success=False, last_chat_id=last_chat_id, mind_map_data=MindMapData(nodes=[], links=[]))
