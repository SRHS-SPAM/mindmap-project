import React, { useState, useEffect, useCallback, useRef } from 'react';

// Firebase imports (following the required structure for React)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, limit, serverTimestamp } from 'firebase/firestore';

// Mock global variables assumed to be available in the environment
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-mindmap-app-id';

// 🌟 API_BASE_URL: 프로젝트 라우터의 루트 경로 (/api/v1/projects)
const API_BASE_URL = "http://localhost:8000/api/v1/projects"; 

// API 호출을 위한 헬퍼 함수
const apiClient = async (path, method = 'GET', data = null) => {
    // path가 '/'이면 API_BASE_URL 전체를 사용하고, 아니면 경로를 이어 붙입니다.
    // 예: path가 '/123/chat'일 경우, http://127.0.0.1:8000/api/v1/projects/123/chat 이 됩니다.
    const url = (path === '/') 
        ? API_BASE_URL 
        : `${API_BASE_URL}${path}`;
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        if (response.status === 204) return null; // No Content
        
        const contentType = response.headers.get("content-type");
        
        // JSON 응답이 아니면 (HTML이 반환된 경우) 명확한 오류를 던집니다.
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            throw new Error(`[라우팅 오류] 서버가 JSON이 아닌 응답을 반환했습니다. 상태: ${response.status}. 내용: ${text.substring(0, 100)}...`);
        }

        const json = await response.json();

        if (!response.ok) {
            throw new Error(json.detail || `API request failed with status ${response.status}`);
        }
        return json;
    } catch (error) {
        console.error("API 통신 오류:", error.message, error);
        throw error;
    }
};

// --- 아이콘 (인라인 SVG) ---
const SendIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send"><path d="m22 2-7 14-4-2-7 4 11-10 2-4z"/></svg>
);
const ZapIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
const ListIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list-collapse"><path d="m3 10 4 4 4-4"/><path d="M7 14V3"/><path d="M21 6H12"/><path d="M21 12H12"/><path d="M21 18H12"/></svg>
);
const RefreshCwIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.76L21 6"/><path d="M21 3v3h-3"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.76L3 18"/><path d="M3 21v-3h3"/></svg>
);

// --- 컴포넌트: 마인드맵 노드 시각화 ---
const MindMapNodeDisplay = ({ node, allNodes, level = 0 }) => {
    // 노드 유형에 따른 스타일 정의
    const isCore = node.node_type === "핵심 주제";
    const isMajor = node.node_type === "대주제";
    const isMinor = node.node_type === "소주제";

    // 연결된 하위 노드 찾기
    const getConnections = () => {
        return node.connections
            ? node.connections.map(conn => allNodes.find(n => n.id === conn.target_id)).filter(n => n)
            : [];
    };

    const connectedNodes = getConnections();
    
    // 연결된 노드를 유형별로 정렬하여 일관성 있게 표시
    const sortedConnectedNodes = connectedNodes.sort((a, b) => {
        const order = {"핵심 주제": 3, "대주제": 2, "소주제": 1};
        return (order[b.node_type] || 0) - (order[a.node_type] || 0);
    });

    const baseStyle = "p-3 rounded-xl shadow-md transition-all duration-300 transform hover:scale-[1.01] border-2";
    let colorClasses = "";

    if (isCore) {
        colorClasses = "bg-red-600/90 border-red-700 text-white font-bold text-lg";
    } else if (isMajor) {
        colorClasses = "bg-blue-500/90 border-blue-600 text-white font-semibold";
    } else if (isMinor) {
        colorClasses = "bg-teal-300/80 border-teal-400 text-gray-800";
    }

    return (
        <div className={`relative ${isCore ? 'w-full' : 'w-full md:w-1/2 lg:w-1/3'}`}>
            <div className={`mb-4 ${baseStyle} ${colorClasses}`}>
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm md:text-md">{node.title} <span className="text-xs opacity-70">({node.node_type})</span></h3>
                </div>
                <p className={`text-xs ${isMinor ? 'text-gray-700' : 'text-gray-200'}`}>{node.description}</p>
            </div>
            
            {/* 연결된 하위 노드를 재귀적으로 렌더링 */}
            <div className={`ml-4 md:ml-8 ${isCore ? 'mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4' : 'mt-2'}`}>
                {sortedConnectedNodes.map(childNode => (
                    // 다음 레벨의 노드만 표시 (재귀 방지를 위해 connections를 참조)
                    <MindMapNodeDisplay 
                        key={childNode.id} 
                        node={childNode} 
                        allNodes={allNodes} 
                        level={level + 1}
                    />
                ))}
            </div>
        </div>
    );
};


const App = () => {
    // --- 상태 관리 ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);

    const [chatHistory, setChatHistory] = useState([]);
    const [newChatMessage, setNewChatMessage] = useState('');
    const [mindMapNodes, setMindMapNodes] = useState([]);
    const [recommendation, setRecommendation] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    
    const chatEndRef = useRef(null);
    
    // --- 유틸리티: UI 메시지 (Alert 대체) 및 상태 정의 ---
    const [toast, setToast] = useState(null);
    const alertUser = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    // --- Firebase 및 인증 초기화 ---
    useEffect(() => {
        if (!firebaseConfig) {
            console.error("Firebase config가 누락되었습니다.");
            setIsAuthReady(true);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // 인증 리스너 설정
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } else {
                            await signInAnonymously(firebaseAuth);
                        }
                    } catch (e) {
                        console.error("Firebase 인증 실패:", e);
                        setUserId(crypto.randomUUID()); // 대체 Mock ID
                    }
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase 초기화 실패:", e);
            setIsAuthReady(true);
        }
    }, []);

    // 최신 메시지로 스크롤
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory]);

    // --- API 통신 함수 ---

    // 1. 프로젝트 목록 조회
    const fetchProjects = useCallback(async () => {
        // 로딩 중이거나 이미 한 번 시도했고 오류가 발생한 상태면 재시도하지 않음
        if (!isAuthReady || isLoading) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            // 경로: /api/v1/projects
            const data = await apiClient("/"); 
            setProjects(data);
            if (data.length > 0 && selectedProjectId === null) {
                // 가장 최근 프로젝트를 자동 선택
                setSelectedProjectId(data[0].id);
            }
            setHasAttemptedLoad(true); // 성공했으면 시도 완료
        } catch (e) {
            setError(e.message);
            setHasAttemptedLoad(true); // 실패했더라도 시도 완료 처리하여 무한 반복 방지
        } finally {
            setIsLoading(false);
        }
    }, [isAuthReady, isLoading, selectedProjectId]);

    // 프로젝트 로드 useEffect: isAuthReady 상태와 hasAttemptedLoad 상태에 의존
    useEffect(() => {
        if (isAuthReady && !hasAttemptedLoad) {
            fetchProjects();
        }
    }, [isAuthReady, hasAttemptedLoad, fetchProjects]);


    // 프로젝트 ID 변경 시 세부 정보 업데이트
    useEffect(() => {
        setSelectedProject(projects.find(p => p.id === selectedProjectId));
        if (selectedProjectId !== null) {
            fetchChatHistory(selectedProjectId);
            fetchMindMapNodes(selectedProjectId);
            setRecommendation(''); // 프로젝트 변경 시 추천 초기화
        } else {
            setChatHistory([]);
            setMindMapNodes([]);
        }
    }, [selectedProjectId, projects]); // eslint-disable-line react-hooks/exhaustive-deps


    // 2. 채팅 기록 조회
    const fetchChatHistory = useCallback(async (projectId) => {
        if (!projectId) return;
        try {
            // 경로: /api/v1/projects/{projectId}/chat
            const data = await apiClient(`/${projectId}/chat`);
            setChatHistory(data);
        } catch (e) {
            console.error("채팅 기록을 불러오지 못했습니다:", e);
        }
    }, []);

    // 3. 메시지 전송
    const sendChatMessage = async (e) => {
        e.preventDefault();
        if (!selectedProjectId || !newChatMessage.trim() || isGenerating) return;

        const messageContent = newChatMessage.trim();
        setNewChatMessage('');
        setError(null);

        // 메시지 즉시 추가 (Optimistic Update)
        const optimisticMessage = {
            id: Date.now(),
            user_id: userId || 'unknown',
            content: messageContent,
            timestamp: new Date().toISOString(),
        };
        setChatHistory(prev => [...prev, optimisticMessage]);

        try {
            // 경로: /api/v1/projects/{selectedProjectId}/chat
            await apiClient(`/${selectedProjectId}/chat`, 'POST', { content: messageContent });
            // API 응답을 통해 실시간 업데이트를 처리할 수 있지만, 여기서는 낙관적 업데이트에 의존합니다.
        } catch (e) {
            setError(e.message);
            setChatHistory(prev => prev.filter(msg => msg.id !== optimisticMessage.id)); // 롤백
            setNewChatMessage(messageContent); // 메시지 복원
        }
    };

    // 4. 마인드맵 생성 요청
    const generateMindMap = async () => {
        if (!selectedProjectId || isGenerating) return;
        setIsGenerating(true);
        setError(null);
        setRecommendation('');

        try {
            // 경로: /api/v1/projects/{selectedProjectId}/generate
            const result = await apiClient(`/${selectedProjectId}/generate`, 'POST');
            await fetchMindMapNodes(selectedProjectId);
            alertUser('success', '마인드맵 생성이 성공적으로 요청되었습니다.');
        } catch (e) {
            setError(e.message);
            alertUser('error', e.message);
        } finally {
            setIsGenerating(false);
        }
    };
    
    // 5. 마인드맵 노드 조회
    const fetchMindMapNodes = useCallback(async (projectId) => {
        if (!projectId) return;
        try {
            // 경로: /api/v1/projects/{projectId}/mindmap
            const data = await apiClient(`/${projectId}/mindmap`);
            setMindMapNodes(data);
        } catch (e) {
            console.error("마인드맵 노드를 불러오지 못했습니다:", e);
        }
    }, []);

    // 6. AI 추천 요청
    const getRecommendation = async () => {
        if (!selectedProjectId || mindMapNodes.length === 0) {
            alertUser('warning', '마인드맵이 생성된 후 시도해 주세요.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setRecommendation('AI가 마인드맵과 채팅 기록을 분석하여 개선 사항을 추천 중입니다...');
        
        try {
            // 경로: /api/v1/projects/{selectedProjectId}/recommend
            const data = await apiClient(`/${selectedProjectId}/recommend`, 'POST');
            setRecommendation(data.recommendation);
        } catch (e) {
            setError(e.message);
            setRecommendation('추천을 가져오는 데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- 유틸리티: 계층 구조 빌더 ---
    const buildHierarchy = (nodes) => {
        if (!nodes || nodes.length === 0) return [];

        const nodeMap = new Map();
        nodes.forEach(node => nodeMap.set(node.id, node));

        // 최상위 노드 (핵심 주제)를 필터링
        const coreNodes = nodes.filter(node => node.node_type === "핵심 주제");
        
        return coreNodes;
    };

    const hierarchicalMap = buildHierarchy(mindMapNodes);
    
    // --- UI 렌더링 ---

    const ProjectSelector = () => (
        <div className="p-4 bg-gray-900 border-r border-gray-700 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                    <ListIcon className="w-5 h-5 mr-2 text-teal-400" /> 프로젝트 목록
                </h2>
                {/* 수동 새로고침 버튼 */}
                <button
                    onClick={() => setHasAttemptedLoad(false)} // 다시 로드 시도 상태로 변경
                    disabled={isLoading}
                    title="프로젝트 목록 새로고침"
                    className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                >
                    <RefreshCwIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            {(isLoading && !error) && <p className="text-gray-400">불러오는 중...</p>}
            
            {/* 오류 메시지 표시 */}
            {error && (
                <div className="p-3 mb-4 bg-red-900/50 border border-red-500 rounded-lg text-sm text-red-300">
                    <p className="font-bold">로딩 실패:</p>
                    <p>{error}</p>
                    <p className="mt-2 text-xs">API_BASE_URL: <span className="font-mono">{API_BASE_URL}</span></p>
                    <p className="mt-2 text-xs">위의 새로고침 버튼을 눌러보거나, 백엔드 라우팅 설정을 확인하세요.</p>
                </div>
            )}
            
            <div className="space-y-2">
                {projects.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors duration-200 
                            ${p.id === selectedProjectId ? 'bg-teal-600 text-white shadow-lg' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                    >
                        <p className="font-semibold truncate">{p.title}</p>
                        <p className="text-xs opacity-70 mt-1">멤버: {p.members ? p.members.length : 0}명</p>
                    </button>
                ))}
            </div>
            {projects.length === 0 && !isLoading && !error && (
                <p className="text-gray-400 text-sm mt-4">프로젝트가 없습니다. (참고: 첫 메시지 전송 시 임시 프로젝트가 생성될 수 있습니다.)</p>
            )}
        </div>
    );

    const ChatInterface = () => (
        <div className="flex flex-col h-full bg-gray-800">
            {/* 헤더 */}
            <div className="p-4 border-b border-gray-700 bg-gray-900 shadow-md">
                <h2 className="text-2xl font-extrabold text-white truncate">
                    {selectedProject ? selectedProject.title : '프로젝트를 선택하세요'}
                </h2>
                {selectedProject && (
                    <p className="text-xs text-gray-400 mt-1">
                        사용자 ID: <span className="font-mono text-teal-400 text-[10px]">{userId || 'Loading...'}</span>
                    </p>
                )}
            </div>

            {/* 채팅 메시지 */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {chatHistory.map(msg => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.user_id === userId ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl shadow-lg
                            ${msg.user_id === userId 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-gray-700 text-gray-100 rounded-tl-none'
                            }`}
                        >
                            <p className="font-bold text-xs mb-1 opacity-80">
                                {msg.user_id === userId ? '나' : `사용자 ${msg.user_id ? msg.user_id.substring(0, 8) : 'unknown'}...`}
                            </p>
                            <p className="text-sm break-words">{msg.content}</p>
                            <span className="block text-[10px] mt-1 opacity-60 text-right">
                                {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            
            {/* 채팅 입력 */}
            <form onSubmit={sendChatMessage} className="p-4 border-t border-gray-700 bg-gray-900">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        disabled={!selectedProjectId || isGenerating}
                        className="flex-grow p-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!selectedProjectId || !newChatMessage.trim() || isGenerating}
                        className="p-3 bg-teal-500 rounded-xl text-white hover:bg-teal-600 transition-colors duration-200 shadow-lg disabled:bg-gray-500 disabled:shadow-none"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );

    const MindMapArea = () => (
        <div className="flex flex-col h-full bg-gray-700 overflow-y-auto p-6">
            {/* 컨트롤 버튼 */}
            <div className="flex justify-between items-center mb-6 p-4 bg-gray-800 rounded-xl shadow-lg flex-wrap gap-3">
                <h2 className="text-2xl font-bold text-white">AI 마인드맵 분석</h2>
                <div className="flex space-x-3">
                    <button
                        onClick={generateMindMap}
                        disabled={!selectedProjectId || isGenerating || chatHistory.length === 0}
                        className="flex items-center px-4 py-2 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 transition-colors duration-200 shadow-md disabled:bg-gray-500"
                    >
                        {isGenerating ? (
                            <div className="animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                            <ZapIcon className="w-4 h-4 mr-2" />
                        )}
                        {isGenerating ? '분석 중...' : 'AI 마인드맵 생성'}
                    </button>
                    <button
                        onClick={getRecommendation}
                        disabled={!selectedProjectId || mindMapNodes.length === 0 || isLoading}
                        className="flex items-center px-4 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg hover:bg-yellow-600 transition-colors duration-200 shadow-md disabled:bg-gray-500 disabled:text-gray-300"
                    >
                        {isLoading ? (
                            <div className="animate-spin mr-2 w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full"></div>
                        ) : (
                            <ZapIcon className="w-4 h-4 mr-2" />
                        )}
                        AI 개선 추천
                    </button>
                </div>
            </div>

            {/* AI 추천 표시 */}
            <div className="mb-6 p-4 bg-gray-800 border-l-4 border-yellow-500 rounded-lg shadow-inner">
                <h3 className="text-lg font-bold text-white mb-2">AI 추천 ({selectedProject?.title || '선택된 프로젝트'})</h3>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {recommendation || "AI 추천을 받으려면 'AI 개선 추천' 버튼을 눌러보세요. 현재 마인드맵과 채팅 내용을 기반으로 구조적 개선점을 제안합니다."}
                </p>
            </div>
            
            {/* 마인드맵 시각화 */}
            <div className="flex-grow p-4 bg-gray-800 rounded-xl shadow-xl border border-gray-600">
                <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">마인드맵 구조</h3>
                
                {mindMapNodes.length === 0 ? (
                    <p className="text-gray-400 text-center py-12">
                        채팅을 시작하고 'AI 마인드맵 생성' 버튼을 눌러 프로젝트 구조를 만들어보세요.
                    </p>
                ) : (
                    <div className="space-y-6">
                        {/* 최상위 핵심 주제 노드부터 렌더링 시작 */}
                        {hierarchicalMap.map(node => (
                            <MindMapNodeDisplay 
                                key={node.id} 
                                node={node} 
                                allNodes={mindMapNodes}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // --- Toast 메시지 표시 컴포넌트 ---
    const Toast = () => toast && (
        <div className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-xl text-white z-50
            ${toast.type === 'success' ? 'bg-green-600' : 
              toast.type === 'error' ? 'bg-red-600' : 'bg-yellow-600'}`}>
            {toast.message}
        </div>
    );


    // --- 로딩 스크린 ---
    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                <p className="ml-4">인증 초기화 중...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 font-sans p-4">
            <h1 className="text-3xl font-extrabold text-white mb-6 text-center">
                협업 프로젝트: AI 마인드맵 및 채팅 분석
            </h1>
            <div className="flex flex-col md:flex-row h-[80vh] bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
                {/* 좌측 패널: 프로젝트 선택 */}
                <div className="w-full md:w-1/4 min-w-[200px] max-h-full md:max-h-none">
                    <ProjectSelector />
                </div>
                
                {/* 중앙 패널: 채팅 인터페이스 */}
                <div className="w-full md:w-1/3 min-w-[300px] border-y md:border-y-0 md:border-r border-gray-700 max-h-full md:max-h-none">
                    <ChatInterface />
                </div>

                {/* 우측 패널: 마인드맵 및 AI 추천 */}
                <div className="flex-grow max-h-full md:max-h-none">
                    <MindMapArea />
                </div>
            </div>
            <Toast />
        </div>
    );
};

export default App;
