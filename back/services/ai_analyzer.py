# AI 모델과 관련된 로직이 포함된 파일입니다.
import os
import json
from typing import List, Dict, Any, Optional
from ..schemas import ChatMessage, AIAnalysisResult, MindMapData, MindMapNodeBase
# DB 세션 타입을 정의하기 위해 ORM 모델을 import합니다.
from ..models import MindMapNode as ORMMindMapNode

import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session # 세션 타입 명시

# 💡 [Vertex AI 설정]
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "minmap-476213") 
REGION = os.getenv("GCP_REGION", "asia-northeast3") # 서울 리전
GEMINI_MODEL = "gemini-1.5-pro"

# 💡 [Vertex AI Client 초기화]
try:
    vertexai.init(project=PROJECT_ID, location=REGION)
    
    # GenerativeModel 인스턴스 생성
    MODEL_CLIENT = GenerativeModel(model_name=GEMINI_MODEL)
    CLIENT = "Ready" 
    print(f"✅ Vertex AI 모델 초기화 성공! (Model: {GEMINI_MODEL}, Project: {PROJECT_ID}, Region: {REGION})")
except Exception as e:
    print(f"❌ Vertex AI GenerativeModel 초기화 오류: {e}")
    CLIENT = None


# Node 및 Link 구조를 만들기 위한 헬퍼 함수
def create_node(id: str, type: str, title: str, desc: str, connections: List[str] = None) -> Dict[str, Any]:
    return MindMapNodeBase(
        id=id,
        node_type=type,
        title=title,
        description=desc,
        connections=[{"target_id": tid} for tid in (connections or [])]
    ).model_dump() 

def create_link(source: str, target: str) -> Dict[str, str]:
    return {"source": source, "target": target}


# 💡 마인드맵 생성을 위한 Pydantic 스키마
class MindMapNodeOutput(BaseModel):
    id: str = Field(..., description="고유한 노드 ID (예: 'core-1')")
    node_type: str = Field(..., description="노드의 계층 레벨")
    title: str = Field(..., description="노드의 핵심 제목")
    description: Optional[str] = Field(None, description="노드의 상세 내용")
    connections: List[Dict[str, str]] = Field(default_factory=list, description="연결 정보")

class MindMapDataOutput(BaseModel):
    nodes: List[MindMapNodeOutput] = Field(..., description="마인드맵 노드 목록")
    links: List[Dict] = Field(default_factory=list, description="노드 간 연결")


# === AI 추천 기능 ===
def recommend_map_improvements(map_data: Dict[str, Any], chat_history: List[ChatMessage]) -> str:
    """
    마인드맵을 기반으로 개선 사항을 추천하는 AI 함수. (500자 이내)
    """
    current_map_json = json.dumps(map_data, ensure_ascii=False, indent=2)
    recent_chat_text = "\n".join([
        f"[{chat.user_id} - {chat.timestamp.strftime('%H:%M')}] {chat.content}" 
        for chat in chat_history[-20:]
    ])

    prompt = f"""
당신은 협업 프로젝트의 진행 상황을 분석하고 마인드맵 구조에 대한 구체적인 개선 사항을 추천하는 전문 AI입니다.
사용자들이 채팅으로 논의한 내용과 현재 마인드맵 구조를 비교하여, 다음 중 하나 이상의 관점에서 500자 이내로 간결하고 명확하게 답변해야 합니다.

**주요 추천 관점:**
1. **구조 개선:** 누락된 핵심 주제/대주제/소주제가 있는지, 노드가 너무 많거나 적은지, 불필요하게 복잡한 연결이 있는지.
2. **논의 심화:** 채팅에서 언급되었으나 마인드맵에 반영되지 않은 중요한 후속 논의 주제가 있는지.
3. **정리 제안:** 모호하거나 불완전한 노드를 어떻게 수정하면 좋을지.

답변은 Markdown 형식의 텍스트로만 반환하고, JSON 형식이나 다른 추가적인 정보를 포함해서는 안 됩니다.

---
현재 마인드맵 구조:
{current_map_json}

---
최근 채팅 기록:
{recent_chat_text}

---
이 두 정보를 기반으로, 프로젝트 진행 및 마인드맵 개선을 위한 구체적인 추천 사항을 500자 이내로 제시해 주세요.
"""
    
    if not CLIENT:
        return "Vertex AI Client가 초기화되지 않아 AI 분석을 수행할 수 없습니다."

    try:
        response = MODEL_CLIENT.generate_content(
            contents=[prompt],
            generation_config=GenerationConfig(
                temperature=0.7,
                max_output_tokens=500
            )
        )
        return response.text
        
    except Exception as e:
        print(f"Vertex AI 추천 API 요청 오류: {e}")
        return "AI 분석 서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."


# === 실제 AI 분석 및 마인드맵 생성 함수 ===
def analyze_chat_and_generate_map(
    project_id: int, 
    chat_history: List[ChatMessage], 
    last_processed_chat_id: int,
    db_session: Session
) -> AIAnalysisResult:
    """
    채팅 기록을 분석하여 Vertex AI를 통해 마인드맵 구조를 생성하고 반환합니다.
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

    # 3. 기존 마인드맵 정보 로드
    existing_nodes = db_session.query(ORMMindMapNode).filter(
        ORMMindMapNode.project_id == project_id
    ).all()
    
    existing_map_info = "\n".join([
        f"- ID: {node.id}, Title: {node.title}, Description: {node.description}" 
        for node in existing_nodes
    ]) if existing_nodes else "기존 마인드맵 정보 없음."

    # JSON 스키마 예시를 프롬프트에 포함
    prompt = f"""
당신은 사용자들의 대화를 분석하여 구조화된 마인드맵(MindMap) 데이터로 변환하는 전문 AI입니다.
기존 마인드맵 정보가 있다면 새로운 대화 내용을 추가, 수정, 또는 삭제하여 마인드맵을 업데이트해야 합니다.

**마인드맵 계층 구조:**
1. '핵심 주제' (core): 대화의 가장 중심적인 목표 또는 주제 (최대 3개)
2. '대주제' (major): 핵심 주제를 이루는 주요 구성 요소 또는 단계 (최대 10개)
3. '소주제' (minor): 대주제를 상세화하는 세부 항목 또는 아이디어 (최대 30개)

**제약 조건:**
- 노드 ID는 고유한 문자열(예: 'core-A', 'major-1', 'minor-1-a')이어야 합니다.
- connections 필드는 노드 간의 관계를 나타내며, 반드시 존재하는 노드의 ID를 가리켜야 합니다.
- 응답은 반드시 유효한 JSON 형식이어야 하며, 다른 텍스트는 포함하지 마세요.

**기존 마인드맵 정보:**
{existing_map_info}

**응답 형식 예시:**
{{
    "nodes": [
        {{
            "id": "core-1",
            "node_type": "핵심 주제",
            "title": "프로젝트 목표",
            "description": "프로젝트의 전반적인 목표 설명",
            "connections": [{{"target_id": "major-1"}}]
        }},
        {{
            "id": "major-1",
            "node_type": "대주제",
            "title": "첫 번째 주요 단계",
            "description": "상세 설명",
            "connections": [{{"target_id": "core-1"}}, {{"target_id": "minor-1"}}]
        }}
    ],
    "links": []
}}

---
새로 업데이트된 채팅 기록:
{new_chat_text}

---
위 채팅 내용을 분석하여 마인드맵 JSON을 생성해주세요.
"""
    
    if not CLIENT:
        return AIAnalysisResult(
            is_success=False, 
            last_chat_id=last_chat_id, 
            mind_map_data=MindMapData(nodes=[], links=[])
        )

    try:
        response = MODEL_CLIENT.generate_content(
            contents=[prompt],
            generation_config=GenerationConfig(
                temperature=0.7,
                response_mime_type="application/json",
                max_output_tokens=2048
            )
        )
        
        # 응답 텍스트를 파싱
        json_string = response.text
        
        # JSON 파싱 전 정리 (혹시 모를 추가 텍스트 제거)
        json_string = json_string.strip()
        if json_string.startswith("```json"):
            json_string = json_string[7:]
        if json_string.startswith("```"):
            json_string = json_string[3:]
        if json_string.endswith("```"):
            json_string = json_string[:-3]
        json_string = json_string.strip()
        
        map_json = json.loads(json_string)

        # MindMapDataOutput Pydantic 모델로 유효성 검사
        validated_data = MindMapDataOutput(**map_json)
        
        # schemas.py의 MindMapData 구조에 맞게 변환하여 반환
        mind_map_data = MindMapData(
            nodes=validated_data.nodes,
            links=validated_data.links 
        )
        
        return AIAnalysisResult(
            is_success=True,
            last_chat_id=last_chat_id,
            mind_map_data=mind_map_data
        )

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        print(f"Vertex AI 응답 파싱 또는 유효성 검사 오류: {e}")
        print(f"받은 응답: {response.text if 'response' in locals() else 'N/A'}")
        return AIAnalysisResult(
            is_success=False, 
            last_chat_id=last_chat_id, 
            mind_map_data=MindMapData(nodes=[], links=[])
        )
    except Exception as e:
        print(f"Vertex AI API 요청 오류: {e}")
        return AIAnalysisResult(
            is_success=False, 
            last_chat_id=last_chat_id, 
            mind_map_data=MindMapData(nodes=[], links=[])
        )