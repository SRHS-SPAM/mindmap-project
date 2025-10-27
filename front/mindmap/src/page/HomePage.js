import React, { useState, useEffect, useCallback } from 'react'; // 💡 [추가] React Hooks import
import "./HomePage.css"

import Header from "../component/Header";
import Friends from "../component/Friends";

import { useNavigate } from 'react-router-dom'; // 💡 [추가]

// 💡 [추가] API 기본 설정
const BACKEND_BASE_URL = 'http://localhost:8000';
const API_VERSION_PREFIX = '/api/v1';

// --- Project Component (반복되는 프로젝트 카드) ---
const ProjectCard = ({ project, onClick }) => {
    return (
        <div 
            className="act_wrap_item p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition cursor-pointer" 
            onClick={() => onClick(project.id)}
        >
            <h3 className="text-lg font-bold text-gray-800">{project.title}</h3>
            {/* 프로젝트 생성자 (Admin) 표시 */}
            <p className="text-sm text-gray-600 mt-1">
                멤버: {project.members.length}명 | 
                Admin: {project.members.find(m => m.is_admin)?.user.name || '없음'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
                최근 활동: {new Date(project.created_at).toLocaleDateString()}
            </p>
        </div>
    );
};


const HomePage = () => {
    const [projects, setProjects] = useState([]); // 💡 [추가] 프로젝트 목록 상태
    const [isLoading, setIsLoading] = useState(true); // 💡 [추가] 로딩 상태
    const [error, setError] = useState(null); // 💡 [추가] 오류 상태
    const [newProjectTitle, setNewProjectTitle] = useState(''); // 💡 [추가] 새 프로젝트 제목 입력
    const navigate = useNavigate(); // 💡 [추가] useNavigate 훅 사용
    

    // --- 프로젝트 목록 불러오기 (GET /projects) ---
    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const authToken = localStorage.getItem('access_token');
            if (!authToken) {
                setError("로그인 토큰이 없습니다. 로그인해주세요.");
                setIsLoading(false);
                return;
            }

            const response = await fetch(`${BACKEND_BASE_URL}${API_VERSION_PREFIX}/projects/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProjects(data);
            } else {
                const errorDetail = await response.json().catch(() => ({ detail: '응답 파싱 실패' }));
                throw new Error(`프로젝트 로드 실패: ${response.status} (${response.statusText}). 상세: ${errorDetail.detail}`);
            }
        } catch (err) {
            console.error('프로젝트 목록 로드 중 오류:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- 새 프로젝트 생성 (POST /projects) ---
    const createNewProject = useCallback(async () => {
        if (!newProjectTitle.trim()) {
            alert("프로젝트 제목을 입력해주세요.");
            return;
        }

        try {
            const authToken = localStorage.getItem('access_token');
            if (!authToken) {
                alert("인증 토큰이 없습니다. 로그인해주세요.");
                return;
            }

            const response = await fetch(`${BACKEND_BASE_URL}${API_VERSION_PREFIX}/projects/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ title: newProjectTitle.trim() })
            });

            if (response.ok) {
                // 성공 시 프로젝트 목록을 다시 불러오고 입력 필드를 초기화
                setNewProjectTitle('');
                fetchProjects();
            } else {
                const errorDetail = await response.json().catch(() => ({ detail: '응답 파싱 실패' }));
                throw new Error(`프로젝트 생성 실패: ${response.status}. 상세: ${errorDetail.detail}`);
            }
        } catch (err) {
            console.error('프로젝트 생성 중 오류:', err);
            alert(`프로젝트 생성 실패: ${err.message}`);
        }
    }, [newProjectTitle, fetchProjects]);

    // --- 프로젝트 클릭 시 이동 (실제 라우팅으로 대체해야 함) ---
    const handleProjectClick = (projectId) => {
        navigate(`/mind/${projectId}`);
    };

    // --- 컴포넌트 마운트 시 프로젝트 목록 로드 ---
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // --- 렌더링 ---
    return(
        <div className="wrap_ho">
            <Header />
            <div className="info">
                {/* ... (Friends 섹션은 그대로 유지) ... */}
                <div className='text_wrap_ho'>
                    <h1 className='main_text_ho'>HOME</h1>
                </div>
                <div className="people_wrap">
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                </div>

                {/* --- RECENT ACTIVITY 섹션 (프로젝트 목록 및 생성) --- */}
                <div className="resent_wrap"> 
                    <div className='text_wrap_ho flex justify-between items-center'>
                        <h1 className='sub_text_ho'>RECENT ACTIVITY</h1>
                        
                        {/* 💡 [추가] 프로젝트 생성 인터페이스 */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newProjectTitle}
                                onChange={(e) => setNewProjectTitle(e.target.value)}
                                placeholder="새 프로젝트 제목"
                                className="p-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <button 
                                onClick={createNewProject}
                                className="bg-green-600 text-white p-2 rounded-lg text-sm hover:bg-green-700 transition"
                            >
                                + 새 프로젝트
                            </button>
                        </div>
                    </div>
                    
                    <div className="scroll">
                        <div className="act_wrap">
                            {/* 💡 [추가] 로딩/오류/데이터 렌더링 */}
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

                {/* ... (Mind Maps Friends Are Active On 섹션은 그대로 유지) ... */}
                <div className="resent_wrap">
                    <div className='text_wrap_ho'>
                        <h1 className='sub_text_ho'>MIND MAPS YOUR FRIENDS ARE ACTIVE ON</h1>
                    </div>
                    <div className="scroll">
                        <div className="act_wrap">
                            <p>act1</p>
                            <p>act2</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;