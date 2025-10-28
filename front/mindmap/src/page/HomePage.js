import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; 
import "./HomePage.css"

import { useNavigate } from 'react-router-dom';

// 💡 API 기본 설정
const BACKEND_BASE_URL = 'http://localhost:8000';
const API_VERSION_PREFIX = '/api/v1';
const USER_API_URL = `${BACKEND_BASE_URL}${API_VERSION_PREFIX}/user/user`;


// ----------------------------------------------------
// [Component] Header (내부 컴포넌트)
// ----------------------------------------------------
const Header = () => {
    const navigation = useNavigate();
    const isAuthenticated = localStorage.getItem('access_token');

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        navigation('/login');
    };

    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="max-w-6xl mx-auto p-4 flex justify-between items-center">
                <h1 
                    className="text-2xl font-extrabold text-indigo-600 cursor-pointer hover:text-indigo-800 transition"
                    onClick={() => navigation('/main')}
                >
                    MindMapHub
                </h1>
                <nav className="flex space-x-4">
                    {isAuthenticated ? (
                        <>
                            <button 
                                onClick={() => navigation('/friends')}
                                className="text-gray-600 hover:text-indigo-600 font-medium transition"
                            >
                                친구 관리
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 transition"
                            >
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => navigation('/login')}
                            className="text-indigo-600 hover:text-indigo-800 font-medium transition"
                        >
                            로그인
                        </button>
                    )}
                </nav>
            </div>
        </header>
    );
};

// ----------------------------------------------------
// [Component] Friends (내부 컴포넌트 - 접속 중인 친구 카드)
// ----------------------------------------------------
const Friends = ({ friend }) => {
    // 친구 이름의 첫 글자를 따서 아바타 생성
    const avatarLetter = friend.name ? friend.name.charAt(0) : '?';
    const avatarUrl = `https://placehold.co/40x40/4f46e5/ffffff?text=${avatarLetter}`;

    return (
        <div className="p-3 flex flex-col items-center bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition shadow-sm">
            <div className="relative">
                <img 
                    src={avatarUrl} 
                    alt={friend.name} 
                    className="w-10 h-10 object-cover rounded-full mb-1"
                />
                {/* 온라인 상태 표시 (녹색 점) */}
                {friend.is_online && (
                    <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-green-400"></span>
                )}
            </div>
            <p className="text-sm font-semibold text-gray-800 truncate w-full text-center">{friend.name || '알 수 없음'}</p>
            <p className="text-xs text-gray-500">{friend.is_online ? '접속 중' : '오프라인'}</p>
        </div>
    );
};

// ----------------------------------------------------
// [Component] ProjectCard (내부 컴포넌트)
// ----------------------------------------------------
const ProjectCard = ({ project, onClick }) => {
    return (
        <div 
            className="p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition cursor-pointer transform hover:scale-[1.02] min-w-[250px] border border-gray-100" 
            onClick={() => onClick(project.id)}
        >
            <h3 className="text-lg font-bold text-gray-800 truncate">{project.title}</h3>
            <p className="text-sm text-gray-600 mt-1">
                멤버: {project.members?.length || 0}명 | 
                Admin: {project.members?.find(m => m.is_admin)?.user.name || '없음'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
                생성일: {new Date(project.created_at).toLocaleDateString()}
            </p>
        </div>
    );
};

// ----------------------------------------------------
// [Page] FriendPage (내부 페이지 - /friends)
// ----------------------------------------------------
const FriendPage = () => {
    const navigation = useNavigate();
    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <Header />
            <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-lg">
                <button 
                    onClick={() => navigation('/main')} 
                    className="text-indigo-600 hover:text-indigo-800 font-medium mb-4 flex items-center"
                >
                    &larr; 홈으로 돌아가기
                </button>
                <h1 className="text-3xl font-extrabold text-gray-800 border-b pb-2 mb-6">친구 관리 페이지</h1>
                <p className="text-gray-600">
                    전체 친구 목록과 친구 요청 관리 기능이 여기에 들어갑니다.
                    현재 경로는 `/friends`입니다.
                </p>
                {/* 여기에 실제 친구 목록 UI를 구현합니다. */}
            </div>
        </div>
    );
};


// ----------------------------------------------------
// [Page] HomePage (내부 페이지 - /)
// ----------------------------------------------------
const HomePage = () => {
    const navigation = useNavigate();
    
    const [projects, setProjects] = useState([]); 
    const [isLoading, setIsLoading] = useState(true); 
    const [error, setError] = useState(null); 
    const [newProjectTitle, setNewProjectTitle] = useState(''); 
    
    // 💡 [수정] 친구 로딩을 위한 초기 데이터 (API 실패 대비용)
    const [friendsList, setFriendsList] = useState([
        { id: 'test_a', name: '테스트 친구 A', is_online: true },
        { id: 'test_b', name: '테스트 친구 B', is_online: false },
        { id: 'test_c', name: '테스트 친구 C', is_online: true },
    ]); 
    const [isOnlineLoading, setIsOnlineLoading] = useState(false); // 초기 로딩 UI 표시를 위해 false로 설정
    const [statusMessage, setStatusMessage] = useState(null); 

    
    // 1. 사용자 자신의 온라인 상태를 설정하는 함수
    const setOnlineStatus = useCallback(async (status) => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            await axios.post(
                `${USER_API_URL}/set_online`, 
                { is_online: status },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
        } catch (error) {
            console.error("Online status update failed:", error.response?.data || error.message);
        }
    }, []);

    // 2. 친구 목록을 백엔드에서 불러오는 함수
    const fetchFriends = useCallback(async () => {
        setIsOnlineLoading(true);
        const token = localStorage.getItem('access_token');
        if (!token) {
            setIsOnlineLoading(false);
            return; 
        }
        
        try {
            const response = await axios.get(
                `${USER_API_URL}/friends/accepted`, 
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            // Friendship 객체에서 실제 친구 정보 추출
            const normalizedFriends = response.data.map(item => item.friend_user || item);
            setFriendsList(normalizedFriends); 
            // API 성공 시, 임시 데이터는 덮어쓰여지고 실제 친구 목록이 표시됨
        } catch (error) {
            console.error("온라인 친구 목록 로딩 에러:", error.response?.data || error.message);
            // API 실패 시, 임시 데이터 유지
        } finally {
            setIsOnlineLoading(false);
        }
    }, []);

    // 3. 프로젝트 목록 불러오기
    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const authToken = localStorage.getItem('access_token');
            if (!authToken) {
                setError("로그인 토큰이 없습니다. 로그인해주세요.");
                return;
            }

            const response = await axios.get(`${BACKEND_BASE_URL}${API_VERSION_PREFIX}/projects/`, {
                 headers: { 'Authorization': `Bearer ${authToken}` }
            });

            setProjects(response.data);
        } catch (err) {
            console.error('프로젝트 목록 로드 중 오류:', err.response?.data || err.message);
            setError(`프로젝트 로드 실패: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 4. 새 프로젝트 생성
    const createNewProject = useCallback(async () => {
        setStatusMessage(null);
        if (!newProjectTitle.trim()) {
            setStatusMessage("프로젝트 제목을 입력해주세요.");
            return;
        }

        try {
            const authToken = localStorage.getItem('access_token');
            if (!authToken) {
                setStatusMessage("인증 토큰이 없습니다. 로그인해주세요.");
                return;
            }

            await axios.post(`${BACKEND_BASE_URL}${API_VERSION_PREFIX}/projects/`, 
                { title: newProjectTitle.trim() }, 
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );

            setNewProjectTitle('');
            fetchProjects();
            setStatusMessage(`프로젝트 "${newProjectTitle.trim()}"가 생성되었습니다.`);
        } catch (err) {
            console.error('프로젝트 생성 중 오류:', err.response?.data || err.message);
            setStatusMessage(`프로젝트 생성 실패: ${err.message}`);
        }
    }, [newProjectTitle, fetchProjects]);

    // 5. 프로젝트 클릭 시 이동
    const handleProjectClick = (projectId) => {
        navigation(`/mind/${projectId}`);
    };

    // 6. 마운트/언마운트 시 로직
    useEffect(() => {
        // 1. 사용자 상태를 온라인(True)으로 설정
        setOnlineStatus(true);
        // 2. 데이터 로드
        fetchProjects(); 
        fetchFriends(); 

        // 3. 클린업 함수: 언마운트 시 오프라인(False)으로 설정
        return () => {
            setOnlineStatus(false);
        };
    }, [fetchFriends, setOnlineStatus, fetchProjects]);
    
    // 접속 중인 친구만 필터링
    const onlineFriends = friendsList.filter(f => f.is_online);

    // --- 렌더링 ---
    return(
        <div className="min-h-screen bg-gray-50 pb-10">
            <Header />
            <div className="p-6 max-w-6xl mx-auto">
                <div className='mb-8'>
                    <h1 className='text-4xl font-extrabold text-gray-800 mb-6'>HOME</h1>
                </div>

                {/* 💡 접속 중인 친구 목록 영역 */}
                <div className="mb-10 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-bold text-indigo-600 mb-4 border-b pb-2 flex justify-between items-center">
                        접속 중인 친구 ({onlineFriends.length})
                        <button 
                            onClick={() => navigation('/friends')} 
                            className='text-sm text-gray-500 hover:text-indigo-700 transition'
                        >
                            전체 친구 목록 보기 &gt;
                        </button>
                    </h2>
                    
                    {isOnlineLoading ? (
                        <p className="text-gray-500 py-4 text-center">친구 목록을 불러오는 중...</p>
                    ) : onlineFriends.length === 0 ? (
                        <p className="text-gray-500 py-4 text-center">현재 접속 중인 친구가 없습니다.</p>
                    ) : (
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                             {onlineFriends.map(friend => (
                                <div key={friend.id} className="min-w-[150px] flex-shrink-0">
                                    <Friends friend={friend} /> 
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 상태 메시지 */}
                {statusMessage && (
                    <div className={`p-3 mb-4 rounded-lg text-sm font-medium ${statusMessage.includes('실패') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {statusMessage}
                    </div>
                )}

                {/* --- RECENT ACTIVITY 섹션 (프로젝트 목록 및 생성) --- */}
                <div className="mb-10"> 
                    <div className='flex justify-between items-center mb-4 border-b pb-2'>
                        <h1 className='text-2xl font-bold text-gray-700'>최근 활동 프로젝트</h1>
                        
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newProjectTitle}
                                onChange={(e) => setNewProjectTitle(e.target.value)}
                                placeholder="새 프로젝트 제목"
                                className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button 
                                onClick={createNewProject}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-md"
                            >
                                + 새 프로젝트
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <div className="flex gap-4 p-2">
                            {isLoading && <p className="text-gray-500 p-4">프로젝트를 불러오는 중...</p>}
                            {error && <p className="text-red-500 p-4">오류: {error}</p>}
                            
                            {!isLoading && !error && projects.length === 0 && (
                                <p className="text-gray-500 p-4">참여 중인 프로젝트가 없습니다. 새로 만들어보세요!</p>
                            )}

                            {projects.map(project => (
                                <ProjectCard 
                                    key={project.id} 
                                    project={project} 
                                    onClick={handleProjectClick}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mind Maps Friends Are Active On 섹션 */}
                <div className="mb-10">
                    <div className='mb-4 border-b pb-2'>
                        <h1 className='text-2xl font-bold text-gray-700'>친구들이 활동 중인 마인드맵</h1>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="flex gap-4 p-2">
                            <p className="p-4 bg-white rounded-xl shadow-sm text-gray-500">이 기능은 곧 추가될 예정입니다.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default HomePage;
