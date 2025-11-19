import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; 
import "./HomePage.css"

import Header from "../component/Header";

import { useNavigate } from 'react-router-dom';

// 💡 API 기본 설정
const BACKEND_BASE_URL = 'http://localhost:8000';
const API_HOST = 'http://localhost:8000';
const API_VERSION_PREFIX = '/api/v1';
const USER_API_URL = `${BACKEND_BASE_URL}${API_VERSION_PREFIX}/user/user`;


// ----------------------------------------------------
// [Component] Header (내부 컴포넌트)
// ----------------------------------------------------
// const Header = () => {
//     const navigation = useNavigate();
//     const isAuthenticated = sessionStorage.getItem('access_token');
//     const handleLogout = () => {
//         sessionStorage.removeItem('access_token');
//         navigation('/login');
//     };
// };

// ----------------------------------------------------
// [Component] Friends (내부 컴포넌트 - 접속 중인 친구 카드)
// ----------------------------------------------------
const Friends = ({ friend }) => {
    // Friends 컴포넌트의 스타일은 현재 Tailwind 기반이므로, 
    // .friend_card 클래스 외의 Tailwind 클래스는 유지합니다.
    const imageUrl = friend.profile_image_url;
    const initial = friend.name ? friend.name[0] : (friend.email ? friend.email[0] : '👤');
    const badgeColorClass = friend.is_online 
        ? "bg-green-500 border-2 border-white" 
        : "bg-gray-400 border-2 border-white";
    
    return (
        <div className="friend_card flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 transition duration-150 cursor-pointer">
            
            {/* 🖼️ 프로필 이미지 영역 */}
            <div className="relative w-16 h-16 rounded-full mb-2 flex items-center justify-center bg-gray-200 border-2 border-indigo-500">
                {imageUrl ? (
                    <img 
                        src={
                            imageUrl.startsWith('http') 
                                ? imageUrl 
                                : `${API_HOST}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`
                        } 
                        alt={`${friend.name} 프로필`} 
                        className="w-full h-full object-cover rounded-full" 
                        onError={(e) => { 
                            e.target.style.display = 'none'; 
                            e.target.parentElement.querySelector('.initial-fallback').style.display = 'flex'; 
                        }}
                    />
                ) : null}
                
                {/* 👤 URL이 없거나 로드 실패 시 표시될 이니셜/기본값 */}
                <span 
                    className={`initial-fallback text-2xl font-bold text-gray-600 ${imageUrl ? 'hidden' : 'flex'}`}
                >
                    {initial}
                </span>

                {/* 🟢 온라인 상태 표시 (작은 점) */}
                <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full ${badgeColorClass}`}></span>
            </div>
            
            {/* 이름 표시 */}
            <p className="text-sm font-semibold text-gray-800 truncate w-full text-center">
                {friend.name || friend.email.split('@')[0]}
            </p>
            {/* 상태 메시지 */}
            <p className="text-xs text-indigo-500">
                {friend.is_online ? "접속 중" : "오프라인"}
            </p>
        </div>
    );
};
// ----------------------------------------------------
// [Component] ProjectCard (내부 컴포넌트)
// ----------------------------------------------------
const ProjectCard = ({ project, onClick }) => {
    return (
        // 🚨 [수정] act_wrap_item 클래스 사용
        <div 
            className="act_wrap_item" 
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

// ----------------------------------------------------------------------


const HomePage = () => {
    const navigation = useNavigate();
    
    const [projects, setProjects] = useState([]); 
    const [isLoading, setIsLoading] = useState(true); 
    const [error, setError] = useState(null); 
    const [newProjectTitle, setNewProjectTitle] = useState(''); 
    
    const [friendsList, setFriendsList] = useState([
        { id: 'test_a', name: '테스트 친구 A', is_online: true, profile_image_url: null },
        { id: 'test_b', name: '테스트 친구 B', is_online: false, profile_image_url: null },
        { id: 'test_c', name: '테스트 친구 C', is_online: true, profile_image_url: null },
    ]); 
    const [isOnlineLoading, setIsOnlineLoading] = useState(false); 
    const [statusMessage, setStatusMessage] = useState(null);

    
    // 1. 사용자 자신의 온라인 상태를 설정하는 함수
    const setOnlineStatus = useCallback(async (status) => {
        const token = sessionStorage.getItem('access_token');
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
        const token = sessionStorage.getItem('access_token');
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
        } catch (error) {
            console.error("온라인 친구 목록 로딩 에러:", error.response?.data || error.message);
        } finally {
            setIsOnlineLoading(false);
        }
    }, []);

    // 3. 프로젝트 목록 불러오기
    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const authToken = sessionStorage.getItem('access_token');
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
            const authToken = sessionStorage.getItem('access_token');
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
        setOnlineStatus(true);
        fetchProjects(); 
        fetchFriends(); 

        return () => {
            setOnlineStatus(false);
        };
    }, [fetchFriends, setOnlineStatus, fetchProjects]);
    
    // 💡 [수정] 전체 친구 목록을 사용
    const allFriends = friendsList;

    // --- 렌더링 ---
    return(
        // 🚨 [수정] wrap_ho 클래스 적용
        <div className="wrap_ho"> 
            <Header /> {/* Header 컴포넌트는 wrap_ho에 의해 왼쪽 100px 공간을 무시하고 오른쪽 영역에 배치됩니다. */}
            
            {/* 🚨 [수정] info 클래스 적용 */}
            <div className="info"> 
                
                {/* 🚨 [수정] main_text_ho 클래스 적용 */}
                <h1 className='main_text_ho'>HOME</h1> 

                {/* 💡 접속 중인 친구 목록 영역 */}
                {/* 🚨 [수정] people_wrap 클래스 적용 */}
                <div className="people_wrap">
                    {/* 🚨 [수정] sub_text_ho 클래스 적용 */}
                    <h2 className="sub_text_ho">
                        접속 중인 친구 ({allFriends.filter(f => f.is_online).length})
                        <button 
                            onClick={() => navigation('/friends')} 
                            className='text-sm text-gray-500 hover:text-indigo-700 transition' // 이 부분은 Tailwind 클래스 유지
                        >
                            전체 친구 목록 보기 &gt;
                        </button>
                    </h2>

                    {isOnlineLoading ? (
                        <p className="text-gray-500 py-4 text-center">친구 목록을 불러오는 중...</p>
                    ) : allFriends.length === 0 ? ( 
                        <p className="text-gray-500 py-4 text-center">친구 목록이 비어 있습니다.</p>
                    ) : (
                        // 🚨 [수정] scroll 클래스 적용
                        <div className="scroll"> 
                            {/* 🚨 [수정] act_wrap 클래스 적용 (친구 목록은 기존 flex-shrink-0 구조를 유지) */}
                            <div className="act_wrap">
                                {allFriends.map(friend => (
                                    <div key={friend.id} className="min-w-[150px] flex-shrink-0">
                                        <Friends friend={friend} /> 
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 상태 메시지 (Tailwind 클래스 유지) */}
                {statusMessage && (
                    <div className={`p-3 mb-4 rounded-lg text-sm font-medium ${statusMessage.includes('실패') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {statusMessage}
                    </div>
                )}

                {/* --- RECENT ACTIVITY 섹션 (프로젝트 목록 및 생성) --- */}
                {/* 🚨 [수정] resent_wrap 클래스 적용 */}
                <div className="resent_wrap"> 
                    <div className='flex justify-between items-center mb-4 border-b pb-2'> {/* 이 부분은 Tailwind 클래스 유지 */}
                         {/* 🚨 [수정] sub_text_ho 클래스 적용 */}
                        <h1 className='sub_text_ho'>최근 활동 프로젝트</h1> 
                        
                        <div className="flex gap-2"> {/* 이 부분은 Tailwind 클래스 유지 */}
                            <input
                                type="text"
                                value={newProjectTitle}
                                onChange={(e) => setNewProjectTitle(e.target.value)}
                                placeholder="새 프로젝트 제목"
                                className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" // Tailwind 클래스 유지
                            />
                            <button 
                                onClick={createNewProject}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-md" // Tailwind 클래스 유지
                            >
                                + 새 프로젝트
                            </button>
                        </div>
                    </div>
                    
                    {/* 🚨 [수정] scroll 클래스 적용 */}
                    <div className="scroll"> 
                        {/* 🚨 [수정] act_wrap 클래스 적용 (프로젝트 목록) */}
                        <div className="act_wrap">
                            {isLoading && <p className="text-gray-500 p-4">프로젝트를 불러오는 중...</p>}
                            {error && <p className="text-red-500 p-4">오류: {error}</p>}
                            
                            {!isLoading && !error && projects.length === 0 && (
                                <p className="text-gray-500 p-4">참여 중인 프로젝트가 없습니다. 새로 만들어보세요!</p>
                            )}

                            {/* ProjectCard 컴포넌트 내부에서 act_wrap_item 클래스를 사용합니다. */}
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
                <div className="mb-10"> {/* Tailwind 클래스 유지 */}
                    <div className='mb-4 border-b pb-2'> {/* Tailwind 클래스 유지 */}
                         {/* 🚨 [수정] sub_text_ho 클래스 적용 */}
                        <h1 className='sub_text_ho'>친구들이 활동 중인 마인드맵</h1>
                    </div>
                    <div className="overflow-x-auto"> {/* Tailwind 클래스 유지 */}
                        <div className="flex gap-4 p-2"> {/* Tailwind 클래스 유지 */}
                            <p className="p-4 bg-white rounded-xl shadow-sm text-gray-500">이 기능은 곧 추가될 예정입니다.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default HomePage;