import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
// API 키 및 URL 설정 (Canvas 환경에서 자동으로 주입됩니다)
// const apiKey = "";
// const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

// 💡 백엔드 FastAPI 서버의 기본 URL을 상수로 정의
// (FastAPI가 8000번 포트에서 실행된다고 가정)
const BACKEND_BASE_URL = 'http://localhost:8000';

// 💡 [수정 필요] API 버전과 프로젝트 라우터를 포함하여 정확한 경로를 명시합니다.
const API_VERSION_PREFIX = '/api/v1'; // main.py에 설정된 prefix
// MindMapPage.js (수정 후)
// 💡 프로젝트 ID는 아마도 라우팅 파라미터나 상태로 관리될 것입니다. 임시로 하드코딩된 값이라 가정합니다.
// const PROJECT_ID = 1; // 실제로는 React Router 등에서 가져와야 함.
// 백엔드 Fast API 엔드포인트 URL

// 💡 [최종 수정된 호출 URL]
// const BACKEND_GENERATE_URL = `${BACKEND_BASE_URL}${API_VERSION_PREFIX}/projects/${PROJECT_ID}/generate`;
// 참고: project.py 라우터에 prefix="/projects"를 사용했으므로 '/api/v1'은 main.py에서 처리해야 합니다.
// 현재 백엔드 라우터(project.py)에 맞게 '/projects/{project_id}/generate'로 설정합니다.

// 마인드맵 JSON 구조 정의
const mindMapSchema = {
    type: "OBJECT",
    properties: {
        "mainTopic": { "type": "STRING", "description": "전체 채팅 내용을 아우르는 핵심 주제" },
        "branches": {
            "type": "ARRAY",
            "description": "주요 아이디어와 세부 사항 목록",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "topic": { "type": "STRING", "description": "주요 가지(Branch)의 제목" },
                    "details": {
                        "type": "ARRAY",
                        "description": "해당 가지에 대한 3~5개의 구체적인 세부 사항",
                        "items": { "type": "STRING" }
                    }
                },
                "required": ["topic", "details"]
            }
        }
    },
    required: ["mainTopic", "branches"]
};

// 시뮬레이션용 데이터 생성 함수 (실제 LLM이 응답하지 않을 때 사용)
const generateFallbackMindMap = (text) => {
    return {
        "mainTopic": text.length > 50 ? text.substring(0, 50) + "..." : "대화 내용 기반 핵심 주제",
        "branches": [
            {
                "topic": "첫 번째 핵심 논점 (대체 데이터)",
                "details": ["논점 1의 세부 사항 A", "논점 1의 세부 사항 B", "논점 1의 구체적 예시"]
            },
            {
                "topic": "두 번째 중요 아이디어 (대체 데이터)",
                "details": ["아이디어 2의 정의", "아이디어 2의 장점", "아이디어 2의 한계"]
            },
            {
                "topic": "세 번째 관련 요소 (대체 데이터)",
                "details": ["요소 3의 배경", "요소 3의 영향력", "요소 3의 향후 전망"]
            }
        ]
    };
};

// --- Chat Message Component (채팅 메시지 렌더링) ---
const ChatMessage = ({ role, text }) => {
    const isUser = role === 'user';
    return (
        <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-xl p-3 rounded-xl shadow-md ${
                isUser 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
            }`}>
                {text}
            </div>
        </div>
    );
};

// BranchNode 컴포넌트 내부 수정 (파일 상단 부분)
const BranchNode = React.forwardRef(({ branch, branchIndex, detailRefs, style }, ref) => {
    // 💡 [수정] 세부 사항을 즉시 렌더링하도록 기본값을 true로 설정
    const [showDetails, setShowDetails] = React.useState(true); 
    
    // 💡 [추가] BranchIndex가 0인 경우 (가장 위쪽) 세부 주제를 위로 배치
    const isTopBranch = branchIndex === 0;

    return (
        <div key={branchIndex} className="pointer-events-all relative" style={style}>
            {/* 가지(Branch) 노드 */}
            <div 
                ref={ref}
                className="branch-node min-w-[120px] max-w-[200px] text-sm"
                onClick={() => setShowDetails(!showDetails)}
            >
                {branch.topic}
            </div>
            
            {/* 세부 사항 (Details) 리스트 */}
            {showDetails && (
                <ul className={`mt-2 p-2 bg-gray-100 border border-gray-300 rounded-lg shadow-md max-w-[250px] absolute z-10
                    // 💡 [핵심 수정] 상단 브랜치일 경우 위쪽으로 배치 (bottom-full)
                    ${isTopBranch ? 'bottom-full mb-4' : 'top-full mt-4'}
                    left-1/2 transform -translate-x-1/2
                    text-left
                `} style={{ minWidth: '150px' }}>
                    {branch.details.map((detail, detailIndex) => (
                        <li 
                            key={detailIndex} 
                            className="detail-item text-xs my-1 relative" 
                        >
                            <div
                                ref={el => {
                                    if (!detailRefs.current[branchIndex]) {
                                        detailRefs.current[branchIndex] = [];
                                    }
                                    detailRefs.current[branchIndex][detailIndex] = el;
                                }}
                                className="detail-text p-1"
                            >
                                {detail}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
});
// Component 이름을 명확히 지정합니다.
BranchNode.displayName = 'BranchNode';

// --- Mind Map Rendering Component (마인드맵 구조 렌더링) ---
const MindMapOutput = ({ mindMapData, errorMessage }) => {

    // 💡 [수정] mindMapData의 유효성 검사 및 초기값 설정
    const { mainTopic, branches } = mindMapData || { mainTopic: '주제를 생성하세요', branches: [] };

    // 💡 [수정] useRef는 컴포넌트 내부에서 생성하며, 각 ref의 초기값은 null입니다.
    const coreRef = React.useRef(null);
    const branchRefs = React.useRef([]);
    const detailRefs = React.useRef({});
    const svgRef = React.useRef(null);

    // 💡 [상수 정의] Core 위치와 Branch 거리를 픽셀로 정의
    const CORE_CENTER_X = 300; // Core의 중앙 X 좌표 (px)
    const CORE_CENTER_Y = 300; // Core의 중앙 Y 좌표 (px)
    const RADIUS = 150; // Core에서 Branch까지의 거리 (px) - 선 길이 조정

    // 연결선을 그리는 함수 (핵심 주제 -> 가지, 가지 -> 세부사항)
    const drawConnections = React.useCallback(() => {
        const svgElement = svgRef.current;
        const coreElement = coreRef.current;

        if (!svgElement || !coreElement) return;

        // Bounding Rects는 화면 좌표를 기준으로 하므로, SVG의 상대 좌표로 변환해야 합니다.
        const svgRect = svgElement.getBoundingClientRect();
        const coreRect = coreElement.getBoundingClientRect();
        // SVG 내의 중심 좌표 계산
        const coreX = coreRect.left + coreRect.width / 2 - svgRect.left;
        const coreY = coreRect.top + coreRect.height / 2 - svgRect.top;

        // 이전에 그린 선들 제거
        while (svgElement.lastChild) {
            svgElement.removeChild(svgElement.lastChild);
        }

        // 핵심 주제 -> 가지 연결선 (Primary Branches)
        branches.forEach((branch, branchIndex) => {
            const branchElement = branchRefs.current[branchIndex];
            if (branchElement) {
                const branchRect = branchElement.getBoundingClientRect();
                const branchX = branchRect.left + branchRect.width / 2 - svgRect.left;
                const branchY = branchRect.top + branchRect.height / 2 - svgRect.top;

                // 💡 [핵심 복구] Core -> Branch 선 시작/끝점 조정
                const dx_c2b = branchX - coreX; 
                const dy_c2b = branchY - coreY; 
                const distance_c2b = Math.sqrt(dx_c2b * dx_c2b + dy_c2b * dy_c2b); 
                
                const coreRadius = coreRect.width / 2; 
                const branchRadius = branchRect.width / 2; 
                
                // Core 경계의 시작점
                const startX = coreX + (dx_c2b / distance_c2b) * coreRadius;
                const startY = coreY + (dy_c2b / distance_c2b) * coreRadius;
                
                // Branch 경계의 끝점
                const endX = branchX - (dx_c2b / distance_c2b) * branchRadius;
                const endY = branchY - (dy_c2b / distance_c2b) * branchRadius;
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const d = `M ${startX} ${startY} L ${endX} ${endY}`; // 경계에 맞춘 직선
                path.setAttribute('d', d);
                path.setAttribute('stroke', '#6366f1'); // indigo-500
                path.setAttribute('stroke-width', '3');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');

                svgElement.appendChild(path); // **<--- Core-Branch 선 그리기 복구 완료**

                // 가지 -> 세부사항 연결선 (Secondary Details)
                const details = detailRefs.current[branchIndex] || [];
                const isTopBranch = branchIndex === 0;
                
                // Branch 노드의 상단 또는 하단 경계
                const branchEdgeY = isTopBranch ? (branchRect.top - svgRect.top) : (branchRect.top + branchRect.height - svgRect.top); 
                
                details.forEach(detailElement => {
                    if (detailElement) {
                        const detailRect = detailElement.getBoundingClientRect();
                        
                        // Detail 노드의 중앙 X 좌표
                        const detailX = detailRect.left + detailRect.width / 2 - svgRect.left;
                        
                        // Detail 노드의 상단 또는 하단 경계
                        const detailEdgeY = isTopBranch ? (detailRect.top + detailRect.height - svgRect.top) : (detailRect.top - svgRect.top);

                        // Branch에서 세부 항목으로 수직으로 선을 긋습니다.
                        const startX_d = branchX; 
                        const startY_d = branchEdgeY; // Branch 노드의 상단/하단 경계

                        const endX_d = detailX;
                        const endY_d = detailEdgeY; // Detail 노드의 상단/하단 경계
                        
                        const detailPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        
                        // 💡 [수정] Branch 경계 -> Detail 경계로 수직 연결
                        const dDetail = `M ${startX_d} ${startY_d} L ${endX_d} ${endY_d}`; 
                        
                        detailPath.setAttribute('d', dDetail);
                        detailPath.setAttribute('stroke', '#94a3b8'); // slate-400
                        detailPath.setAttribute('stroke-width', '2');
                        detailPath.setAttribute('fill', 'none');
                        detailPath.setAttribute('stroke-linecap', 'round');

                        svgElement.appendChild(detailPath);
                    }
                });
            }
        });
    }, [branches]); // 의존성 배열 유지

    React.useEffect(() => {
    // refs 초기화 및 재설정 로직 (명확하게 초기화)
    branchRefs.current = [];
    detailRefs.current = {}; // 전체 detailRefs 객체를 초기화

        // 렌더링 후 DOM 요소 크기 계산을 위해 setTimeout으로 지연
    const timer = setTimeout(() => {
      if (branches && branches.length > 0) {
        drawConnections();
      }
    }, 100); 

    window.addEventListener('resize', drawConnections);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', drawConnections);
    };
        // 💡 [핵심 수정] detailRefs.current 객체가 변경될 때도 선을 다시 그리도록 강제합니다.
  }, [branches, drawConnections, detailRefs.current]); // <--- detailRefs.current 추가
        
    // 에러 메시지 렌더링
    if (errorMessage) {
        return (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <p className="font-bold">마인드맵 생성 오류:</p>
                <p>{errorMessage}</p>
                <p className="mt-2 text-sm">대화 내용으로 대체 마인드맵이 생성됩니다.</p>
            </div>
        );
    }

    return (
        // ********** [수정: 컨테이너 스타일 - minHeight를 충분히 주고 중앙 정렬] **********
        <div className="mindmap-container w-full h-full relative" style={{ minHeight: '600px', display: 'block' }}>
            
            {/* 연결선 SVG 레이어 */}
            <div className="connection-line" style={{ height: '100%', width: '100%' }}>
                <svg ref={svgRef} className="absolute inset-0 w-full h-full"></svg>
            </div>

            {/* 메인 주제 (Core) */}
            <div ref={coreRef} className="core-topic z-20" 
                 style={{ 
                     // 💡 [수정] Core의 위치를 픽셀 기반으로 고정
                     position: 'absolute', 
                     left: `${CORE_CENTER_X}px`, 
                     top: `${CORE_CENTER_Y}px`, 
                     transform: 'translate(-50%, -50%)' 
                 }}
            >
                {mainTopic}
            </div>
            
            {/* 가지(Branches)와 세부 사항 (Details) 컨테이너 */}
            <div className="absolute inset-0 pointer-events-none">
                {branches.map((branch, branchIndex) => {
                    
                    // ********** [핵심 로직 수정: 픽셀 기반 위치 계산] **********
                    const totalBranches = branches.length;
                    const angleStep = 360 / totalBranches;
                    const angle = angleStep * branchIndex; 
                    
                    const radian = (angle - 90) * (Math.PI / 180); 
                    
                    // 💡 [수정] Core의 중심 좌표(px)를 기준으로 Branch의 좌표(px) 계산
                    const branchX = CORE_CENTER_X + RADIUS * Math.cos(radian); 
                    const branchY = CORE_CENTER_Y + RADIUS * Math.sin(radian); 
                    
                    // ********** [핵심 로직 끝] **********

                    return (
                        <BranchNode
                            key={branchIndex}
                            branch={branch}
                            branchIndex={branchIndex}
                            // ref를 사용하여 branchRefs.current 배열에 요소 저장
                            ref={el => branchRefs.current[branchIndex] = el}
                            detailRefs={detailRefs} // detailRefs를 Prop으로 전달
                            
                            // 💡 [수정] 위치 스타일을 픽셀(px) 단위로 전달
                            style={{
                                position: 'absolute',
                                left: `${branchX}px`,
                                top: `${branchY}px`,
                                transform: 'translate(-50%, -50%)', // 노드의 중심 맞추기
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

// --- Main App Component (메인 애플리케이션) ---
const App = () => {
    // State Hooks: 채팅 내역, 입력 값, 마인드맵 데이터, 로딩 상태, 오류 메시지
    const [chatHistory, setChatHistory] = useState([
        { role: 'model', text: "안녕하세요! 마인드맵으로 만들고 싶은 주제에 대해 대화해보세요. 대화 후 '마인드맵 생성' 버튼을 눌러주세요." }
    ]);
    const [chatInput, setChatInput] = useState('');
    // 💡 [재수정] 초기값을 MindMapOutput에서 사용하는 { mainTopic, branches } 구조로 명확히 설정
    const [mindMapData, setMindMapData] = useState({ 
        mainTopic: '대화를 시작하세요', // 초기 주제
        branches: [] // branches는 항상 배열이어야 합니다.
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // 💡 [수정] useParams를 사용하여 프로젝트 ID를 동적으로 가져옵니다.
    const { projectId: routeProjectId } = useParams();
    
    // 프로젝트 ID를 상수로 정의하거나, 숫자로 변환합니다.
    // URL 파라미터는 문자열이므로 숫자로 변환합니다 (NaN 방지).
    const PROJECT_ID = parseInt(routeProjectId, 10);

    // 💡 [추가] 사용자 정보를 위한 State
    const [currentUser, setCurrentUser] = useState(null);
    
    // 💡 [수정] BACKEND_GENERATE_URL을 컴포넌트 내에서 PROJECT_ID를 사용해 동적으로 정의합니다.
    // projectId가 유효하지 않으면 요청을 보내지 않도록 합니다.
    const BACKEND_GENERATE_URL = PROJECT_ID && !isNaN(PROJECT_ID)
        ? `${BACKEND_BASE_URL}${API_VERSION_PREFIX}/projects/${PROJECT_ID}/generate`
        : null;

    // 💡 API 기본 URL 정의 (InfoPage.js와 통일)
    const API_BASE_URL = BACKEND_BASE_URL; // http://localhost:8000
    
    // Ref: 채팅 로그 자동 스크롤을 위한 참조
    const chatLogRef = React.useRef(null);

    // --- 💡 [새로운 로직] 사용자 정보 로드 함수 ---
    const fetchCurrentUser = useCallback(async () => {
        const token = sessionStorage.getItem('access_token');
        if (!token) return; // 토큰 없으면 로드 시도 안 함

        try {
            const response = await fetch(`${API_BASE_URL}${API_VERSION_PREFIX}/auth/me`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const userData = await response.json();
                setCurrentUser(userData); // { id: 0, email: "...", name: "..." }
            } else {
                console.error("사용자 정보 로드 실패:", response.status);
                // 토큰이 유효하지 않으면 로그아웃 처리 유도 (선택 사항)
            }
        } catch (error) {
            console.error("Fetch Error (User Profile):", error);
        }
    }, [API_BASE_URL, API_VERSION_PREFIX]); 



    // --- 💡 [새로운 로직] 채팅 기록 로드 함수 ---
    const getChatHistory = useCallback(async (userId) => {
        if (!PROJECT_ID || isNaN(PROJECT_ID) || !userId) return;
        
        const authToken = sessionStorage.getItem('access_token');
        if (!authToken) return;

        try {
            const historyURL = `${BACKEND_BASE_URL}${API_VERSION_PREFIX}/projects/${PROJECT_ID}/chat`;
            const response = await fetch(historyURL, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            if (response.ok) {
                const chats = await response.json();
                
                const formattedChats = chats.map(chat => ({ 
                    // DB chat 객체의 user_id와 현재 로그인 유저의 id 비교
                    role: chat.user_id === userId ? 'user' : 'model', 
                    text: chat.content,
                    user_id: chat.user_id // 필요하다면 저장
                }));
                
                // 💡 DB에서 불러온 기록이 있으면 초기화 메시지를 제외하고 덮어씁니다.
                if (formattedChats.length > 0) {
                   setChatHistory(formattedChats);
                }
            } else {
                 console.error("채팅 기록 로드 실패", response.status);
            }
        } catch (e) {
            console.error("채팅 기록 로드 중 네트워크 오류", e);
        }
    }, [PROJECT_ID, BACKEND_BASE_URL, API_VERSION_PREFIX]);

    // Effect: 채팅 내역이 업데이트될 때마다 자동으로 스크롤
    useEffect(() => {
        if (chatLogRef.current) {
            chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
        }
    }, [chatHistory]);


    // Effect 2: 💡 [추가] 컴포넌트 마운트 시 사용자 정보 로드
    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);
    

    // Effect 3: 💡 [추가] 사용자 정보 로드 완료 시 채팅 기록 로드
    useEffect(() => {
        if (currentUser) {
            // 사용자 ID를 getChatHistory에 전달
            getChatHistory(currentUser.id);
        }
    }, [currentUser, getChatHistory]);


    // 메시지 전송 로직 수정
    // 메시지 전송 로직 수정 (자동 AI 응답 제거)
    const sendMessage = useCallback(async (e) => {
        e.preventDefault();
        const text = chatInput.trim();
        if (text === '' || !currentUser || !PROJECT_ID) return;

        const authToken = sessionStorage.getItem('access_token');
        if (!authToken) {
            console.error("인증 토큰이 없습니다.");
            return; 
        }
        
        setChatInput(''); // 입력 필드 즉시 초기화
        
        // 💡 [핵심] 백엔드 POST /chat 엔드포인트 호출
        try {
            const chatURL = `${BACKEND_BASE_URL}${API_VERSION_PREFIX}/projects/${PROJECT_ID}/chat`;
            const response = await fetch(chatURL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` 
                },
                body: JSON.stringify({ content: text }) 
            });

            if (response.ok) {
                const savedMessage = await response.json();
                
                // 1. DB 저장 성공 후, UI에 반영 (사용자 메시지)
                setChatHistory(prev => [...prev, { 
                    role: 'user', 
                    text: savedMessage.content,
                    user_id: savedMessage.user_id 
                }]); 
                
                // 2. 🚨 [제거 완료] 이전에 있던 자동 AI 응답 호출 로직이 없습니다. (요청 완료)
                
            } else {
                console.error('채팅 메시지 저장 실패:', response.status, await response.text());
            }

        } catch (error) {
            console.error('네트워크 오류:', error);
        }
        
    }, [chatInput, PROJECT_ID, currentUser, BACKEND_BASE_URL, API_VERSION_PREFIX]);

    // 마인드맵 생성 로직 (Gemini API 호출)
    const generateMindMap = useCallback(async () => {
        if (!BACKEND_GENERATE_URL || chatHistory.length < 2) { 
            console.error('유효하지 않은 프로젝트 ID 또는 대화 내용 부족.');
            setError("프로젝트 ID가 유효하지 않거나 대화 내용이 부족합니다.");
            return;
        }

        setIsLoading(true);
        setMindMapData({ mainTopic: '', branches: [] }); 
        setError(null);
        
        try {
            let parsedResult = null;
            const authToken = sessionStorage.getItem('access_token');
            if (!authToken) {
                throw new Error("인증 토큰이 없습니다. 로그인 상태를 확인하세요.");
            }

            // 💡 1. 백엔드 API 호출
            const response = await fetch(BACKEND_GENERATE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` 
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API 호출 실패: HTTP ${response.status} - ${errorText.substring(0, 50)}...`);
            }

            const result = await response.json(); 
            console.log('🔍 백엔드 응답 전체:', result);

            // 💡 2. 백엔드 응답이 성공인지 먼저 확인
            if (!result.is_success) {
                throw new Error(`백엔드 분석 실패: ${result.message || 'AI 분석 실패'}`);
            }

            // 💡 3. mindmap_data 추출
            let mindmapData = null;
            if (result.mind_map_data) {
                mindmapData = result.mind_map_data;
            } else if (result.mindmap_data) { // 백엔드 키 이름 변형 대응
                mindmapData = result.mindmap_data;
            }

            if (!mindmapData || !mindmapData.nodes) {
                console.error('❌ nodes가 응답에 없습니다:', result);
                throw new Error('백엔드 분석 실패: nodes가 응답에 없습니다.');
            }

            const nodes = mindmapData.nodes;

            // 💡 4. links가 없으면 connections에서 생성
            let links = mindmapData.links || [];
            if (links.length === 0 && nodes) {
                nodes.forEach(node => {
                    if (node.connections && Array.isArray(node.connections)) {
                        node.connections.forEach(conn => {
                            links.push({
                                source: node.id,
                                target: conn.target_id
                            });
                        });
                    }
                });
                console.log('✅ connections에서 links 생성:', links.length, '개');
            }

            // 💡 5. 마인드맵 구조 변환
            const mainTopicNode = nodes.find(node => node.node_type === 'core');
            const majorNodes = nodes.filter(node => node.node_type === 'major');

            const transformedBranches = majorNodes.map(majorNode => {
                const minorLinks = links.filter(link => link.source === majorNode.id);
                const details = minorLinks.map(link => {
                    const minorNode = nodes.find(node => node.id === link.target);
                    return minorNode ? minorNode.title : "세부 내용 없음";
                });

                return {
                    topic: majorNode.title,
                    details: details
                };
            });

            const transformedData = {
                mainTopic: mainTopicNode ? mainTopicNode.title : "주제 추출 실패",
                branches: transformedBranches
            };

            // 💡 6. 최종 검증 및 업데이트
            if (transformedData.branches.length > 0) {
                parsedResult = transformedData;
                setMindMapData(parsedResult);
            } else {
                throw new Error('마인드맵 구조(가지)를 생성하지 못했습니다.');
            }

        } catch (err) {
            console.error('마인드맵 생성 중 오류 발생:', err);
            setError(err.message);
            
            // 오류 발생 시 대체 데이터
            const conversationText = chatHistory.map(msg => msg.text).join(' ');
            setMindMapData(generateFallbackMindMap(conversationText));

        } finally {
            setIsLoading(false);
        }
    }, [chatHistory, BACKEND_GENERATE_URL]);


    return (
        <div className="p-4 md:p-8 min-h-screen" style={{ fontFamily: 'Noto Sans KR, Inter, sans-serif' }}>
            {/* Custom CSS for Mind Map Structure */}
            <style jsx="true">{`
                /* 한국어 폰트 설정 */
                body {
                    font-family: 'Noto Sans KR', 'Inter', sans-serif;
                    background-color: #f7f9fb;
                }
                
                /* 💡 [핵심 추가] 중앙 집중형 마인드맵을 위한 스타일 */
                .mindmap-container {
                    /* 중앙 정렬 및 상대 위치 설정 */
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 400px; /* 최소 높이 설정 */
                    padding: 40px;
                }
                
                .core-topic {
                    /* 핵심 주제 도형 스타일 */
                    position: relative;
                    z-index: 10;
                    min-width: 150px;
                    text-align: center;
                    padding: 20px;
                    border-radius: 50%; /* 원형으로 변경 */
                    background-color: #f59e0b; /* 노란색 */
                    color: white;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    font-size: 1.5rem;
                    font-weight: bold;
                    line-height: 1.2;
                }
                
                .branch-container {
                    /* 소주제(가지) 컨테이너 (핵심 주제를 중심으로 배치) */
                    position: absolute;
                    width: 100%; /* 부모에 맞춰 크기 설정 */
                    height: 100%;
                    top: 0;
                    left: 0;
                    display: flex; /* 가지들을 정렬하기 위해 flex 사용 */
                    flex-direction: column;
                    justify-content: space-around; /* 가지들을 고르게 분포 */
                    align-items: center;
                    pointer-events: none; /* 클릭 이벤트 통과 */
                }
                
                .branch-node {
                    /* 소주제 도형 스타일 */
                    position: relative;
                    z-index: 5;
                    padding: 10px 15px;
                    border-radius: 9999px; /* 알약 모양 */
                    background-color: #3b82f6; /* 파란색 */
                    color: white;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    font-weight: 600;
                    cursor: pointer;
                    pointer-events: all; /* 클릭 이벤트 다시 활성화 */
                    transition: all 0.3s ease;
                    transform: translateX(var(--x, 0)) translateY(var(--y, 0)); /* CSS 변수를 사용한 위치 조정 */
                }
                
                .detail-item {
                    /* 세부 사항 스타일 */
                    list-style-type: '— ';
                    padding-left: 10px;
                    color: #4b5563;
                }

                /* 💡 연결선 효과 (Line Simulation) */
                .connection-line {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    top: 0;
                    left: 0;
                    z-index: 1; /* 핵심 주제와 가지 사이에 위치 */
                    pointer-events: none;
                }

                .connection-line svg {
                    overflow: visible;
                    width: 100%;
                    height: 100%;
                }
                
                .scrollable-area::-webkit-scrollbar {
                    width: 6px;
                }
                /* ... 스크롤바 스타일 유지 ... */
            `}</style>

            <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 border-b pb-3">AI 채팅 마인드맵 생성 데모</h1>
            

            {/* 메인 레이아웃 (채팅과 마인드맵) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[70vh] min-h-[500px]">
                
                {/* 좌측: 채팅 인터페이스 */}
                <div className="flex flex-col bg-white rounded-2xl shadow-xl p-6 h-full">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">1. 대화 기록</h2>
                    
                    {/* 채팅 로그 영역 */}
                    <div 
                        ref={chatLogRef}
                        className="flex-grow overflow-y-auto scrollable-area p-2 mb-4 bg-gray-50 rounded-lg border"
                    >
                        {chatHistory.map((msg, index) => (
                            <ChatMessage 
                                key={index} 
                                role={msg.role} 
                                text={msg.text} 
                            />
                        ))}
                    </div>

                    {/* 채팅 입력 및 전송 */}
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="마인드맵 주제에 대해 이야기해보세요..."
                            className="flex-grow p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition duration-150"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit"
                            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition duration-150 active:scale-95 shadow-md"
                            disabled={isLoading}
                        >
                            전송
                        </button>
                    </form>
                    
                    <button 
                        onClick={generateMindMap}
                        disabled={isLoading}
                        className={`mt-4 w-full font-bold py-3 rounded-xl transition duration-150 active:scale-[0.99] shadow-lg ${
                            isLoading 
                                ? 'bg-indigo-400 cursor-not-allowed opacity-70' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                    >
                        {isLoading ? '생성 중...' : '2. 대화 기반 마인드맵 생성'}
                    </button>
                </div>

                {/* 우측: 마인드맵 결과 */}
                <div className="flex flex-col bg-white rounded-2xl shadow-xl p-6 h-full">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">3. 마인드맵 결과</h2>
                    
                    {/* 콘텐츠 영역 */}
                    <div className="flex-grow overflow-y-auto scrollable-area p-2">
                        {isLoading ? (
                            // 로딩 인디케이터
                            <div className="flex justify-center items-center h-full min-h-[200px]">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                                <p className="ml-4 text-indigo-600 font-medium">AI가 대화 내용을 분석 중...</p>
                            </div>
                        ) : (
                            // 마인드맵 또는 초기 메시지 렌더링
                            <MindMapOutput 
                                mindMapData={mindMapData} 
                                errorMessage={error}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default App;