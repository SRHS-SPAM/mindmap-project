import React, { useState, useEffect, useCallback } from "react";
import Header from "../component/Header";
// Friends 컴포넌트는 사용하지 않으므로 제거합니다.
import { Search } from "lucide-react";
import axios from 'axios'; 

import './FriendPage.css';

// CORS 문제 해결 후에는 BASE_URL은 변함이 없습니다.
const BASE_URL = 'https://mindmap-697550966480.asia-northeast3.run.app/api/v1/user/user'; 


// 1. 친구 목록에 표시될 개별 항목 컴포넌트
// Friend.js 파일 내

// 1. 친구 목록에 표시될 개별 항목 컴포넌트
const FriendListItem = ({ friend }) => {
    // 백엔드에서 받은 URL을 사용하거나, 없으면 빈 문자열을 사용
    const imageUrl = friend.profile_image_url; 
    const initial = friend.name ? friend.name[0] : '👤';

    return (
        <div className="friend_list_item flex items-center p-3 bg-white rounded-xl shadow-md mb-2">
            {/* 🖼️ 프로필 이미지 영역: URL이 있으면 img 태그 사용, 없으면 이니셜 표시 */}
            <div className="friend_profile_img w-10 h-10 rounded-full overflow-hidden mr-4 flex items-center justify-center bg-gray-200">
                {imageUrl ? (
                    <img 
                        // Note: 백엔드 서버의 주소(http://localhost:8000)를 포함해야 할 수 있습니다. 
                        // 만약 imageUrl이 '/uploaded_images/...'와 같은 상대 경로라면,
                        // URL 앞에 BASE_URL의 호스트 부분을 붙여야 합니다.
                        // 현재 BASE_URL = 'http://localhost:8000/api/v1/user/user'이므로,
                        // 이미지 URL은 http://localhost:8000/uploaded_images/... 형태여야 합니다. 
                        // 백엔드에서 절대 경로를 제공한다고 가정하고 그대로 사용합니다.
                        src={
                            imageUrl.startsWith('http') 
                                ? imageUrl 
                                : `https://mindmap-697550966480.asia-northeast3.run.app${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`
                        }
                        alt={`${friend.name} 프로필`} 
                        className="w-full h-full object-cover" 
                        onError={(e) => { 
                            e.target.onerror = null; 
                            e.target.style.display = 'none'; 
                            // 이미지가 로드되지 않을 때 이니셜을 표시하기 위해 다음 div를 보이게 할 수도 있지만, 
                            // 여기서는 간단히 이니셜 span을 기본값으로 남깁니다.
                        }}
                    />
                ) : (
                    // URL이 없거나 로드에 실패했을 때 표시되는 이니셜
                    <span className="text-xl font-bold text-gray-600">
                        {initial}
                    </span>
                )}
            </div> 
            
            <div className="friend_info flex-grow">
                <p className="friend_name text-lg font-semibold">{friend.name || friend.email || '알 수 없는 사용자'}</p>
                <p className="friend_code_display text-sm text-gray-500">Code: {friend.friend_code}</p> 
            </div>
        </div>
    );
};


// 2. 검색 결과를 표시할 컴포넌트 
const FoundFriendCard = ({ user, onAddFriend }) => {
    const imageUrl = user.profile_image_url;
    const initial = user.name ? user.name[0] : '👤';
    
    return (
        <div className="found_friend_card flex items-center justify-between p-4 bg-yellow-50 rounded-xl shadow-inner mb-4">
            {/* 🖼️ 프로필 이미지 영역 수정 */}
            <div className="friend_profile_img w-10 h-10 rounded-full overflow-hidden mr-4 flex items-center justify-center bg-gray-300">
                {imageUrl ? (
                    <img 
                        src={imageUrl.startsWith('http') ? imageUrl : `https://mindmap-697550966480.asia-northeast3.run.app/${imageUrl}`} 
                        alt={`${user.name} 프로필`} 
                        className="w-full h-full object-cover" 
                        onError={(e) => { 
                            e.target.onerror = null; 
                            e.target.style.display = 'none'; 
                        }}
                    />
                ) : (
                    <span className="text-xl font-bold text-gray-700">
                        {initial}
                    </span>
                )}
            </div>  
            
            <div className="friend_info flex-grow">
                {/* 이름 표시 */}
                <p className="friend_name text-lg font-bold">{user.name || user.email}</p>
                {/* 친구 코드 표시 */}
                <p className="friend_code_display text-sm text-gray-600">Code: {user.friend_code}</p> 
            </div>
            {/* 친구 신청 버튼 */}
            <button 
                className="add_friend_btn px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 shadow-md" 
                onClick={() => onAddFriend(user.friend_code)}
            >
                신청하기
            </button>
        </div>
    );
};


const Friend = () => {
    const [searchCode, setSearchCode] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [searchError, setSearchError] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null); // 상태 메시지용
    
    // 친구 목록 상태
    const [friendsList, setFriendsList] = useState([]); 
    const [isLoading, setIsLoading] = useState(true); // 로딩 상태

    // 3. 친구 목록을 백엔드에서 불러오는 함수
    const fetchFriends = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = sessionStorage.getItem('access_token'); 
            if (!token) {
                // 토큰이 없으면 로그인 페이지로 리디렉션하거나 에러 처리
                console.warn("로그인이 필요합니다.");
                setFriendsList([]);
                setIsLoading(false);
                return;
            }
            
            // GET /api/v1/user/user/friends/accepted
            const response = await axios.get(
                `${BASE_URL}/friends/accepted`, 
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            // 응답 데이터는 친구 목록 (UserRead 스키마의 배열)이어야 합니다.
            setFriendsList(response.data); 
            setIsLoading(false);

        } catch (error) {
            console.error("친구 목록 로딩 에러:", error);
            setFriendsList([]);
            setIsLoading(false);
            // 사용자에게 표시할 수 있는 에러 메시지
            setSearchError("친구 목록을 불러오는 데 실패했습니다.");
        }
    }, []);

    // 4. 친구 수락/거절 후 목록을 새로고침하는 함수 (외부 컴포넌트에서 호출될 수 있음)
    const handleFriendUpdate = useCallback(() => {
        // 친구 목록을 새로고침합니다.
        fetchFriends(); 
    }, [fetchFriends]);


    // 5. 컴포넌트가 처음 마운트되거나 새로고침이 필요할 때 목록을 불러옵니다.
    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);


    const searchFriend = useCallback(async () => {
        setSearchError(null);
        setFoundUser(null);
        setStatusMessage(null); 
        
        const code = searchCode.toUpperCase().trim();

        if (code.length !== 7) {
            setSearchError("친구 코드는 정확히 7자리여야 합니다.");
            return;
        }

        try {
            const token = sessionStorage.getItem('access_token'); 
            
            const response = await axios.get(
                `${BASE_URL}/search?friend_code=${code}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setFoundUser(response.data);
            setStatusMessage(`사용자 "${response.data.name || response.data.email}"를 찾았습니다.`);

        } catch (error) {
            console.error("Search error:", error);
            setFoundUser(null); 
            let detail = "친구를 찾을 수 없습니다.";
            if (error.response) {
                detail = error.response.data.detail || detail;
                if (error.response.status === 404) {
                    detail = "해당 친구 코드를 가진 사용자를 찾을 수 없습니다.";
                } else if (error.response.status === 400) {
                    detail = error.response.data.detail;
                }
            }
            setSearchError(detail);
        }
    }, [searchCode]);

    const handleAddFriend = useCallback(async (friendCode) => {
        setStatusMessage(null); 
        if (!friendCode) return;

        try {
            const token = sessionStorage.getItem('access_token');
            
            await axios.post(
                `${BASE_URL}/friends/add`, 
                { friend_code: friendCode }, 
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            setStatusMessage(`친구 코드 ${friendCode}에게 친구 요청을 성공적으로 보냈습니다!`);
            setFoundUser(null); 

        } catch (error) {
            console.error("Add friend error:", error);
            let message = "친구 요청에 실패했습니다.";
            if (error.response) {
                 message = error.response.data.detail || message;
                 if (error.response.status === 400) {
                     message = error.response.data.detail;
                 }
            }
            setStatusMessage(`요청 실패: ${message}`); 
        }
    }, []); 

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            searchFriend();
        }
    };

    return(
        <div className="wrap_f min-h-screen bg-gray-50 font-sans">
            <Header />
            <div className="info mx-auto p-4 md:p-8">
                <div className='text_wrap_f mb-8'>
                    <h1 className='main_text_f text-4xl font-extrabold text-gray-800 mb-5'>Friend</h1>
                    
                    {/* 검색창 영역 */}
                    <div className='search_input_wrap flex items-center bg-white rounded-xl shadow-lg p-3 mt-4'>
                        <input 
                            type="text"
                            placeholder="친구 코드로 검색 (예: A1B2C3D)"
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                            onKeyDown={handleKeyDown}
                            maxLength={7}
                            className="search_input_field flex-grow p-2 text-gray-700 outline-none"
                        />
                        <Search 
                            className="search_icon w-6 h-6 text-blue-500 cursor-pointer hover:text-blue-600 ml-2" 
                            onClick={searchFriend} 
                        />  
                    </div>

                    
                    
                    <h2 className="sub_text_f text-2xl font-bold text-gray-700 mt-10 mb-4">내 친구 ({friendsList.length})</h2>
                </div>

                {/* 상태 및 에러 메시지 영역 */}
                {statusMessage && <p className={`status_message font-bold mt-3 p-2 rounded-lg ${statusMessage.includes('성공적') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{statusMessage}</p>}
                {searchError && <p className="search_error_message text-red-500 mt-3">{searchError}</p>}

                {/* 검색 결과 표시 영역 */}
                <div className="search_result_area p-3">
                    {foundUser && (
                        <FoundFriendCard user={foundUser} onAddFriend={handleAddFriend} />
                    )}
                </div>

                {/* 친구 목록 표시 영역 */}
                <div className="people_wrap">
                    {isLoading ? (
                        <p className="text-gray-500 text-center p-4">친구 목록 로딩 중...</p>
                    ) : friendsList.length === 0 ? (
                        <p className="text-gray-500 text-center p-4 bg-white rounded-lg shadow-md">현재 친구가 없습니다. 친구 코드를 검색하여 새로운 친구를 추가해 보세요! 🥳</p>
                    ) : (
                        friendsList.map(friend => (
                            <FriendListItem key={friend.friend_code} friend={friend} />
                        ))
                    )}
                </div>
                
                <h2 className="sub_text_f text-2xl font-bold text-gray-700 mt-10 mb-4">OTHER PEOPLE</h2>
                {/* 다른 사용자 목록을 표시하는 영역. 현재는 목업으로 비워둡니다. */}
                <div className="opeople_wrap">
                    <p className="text-gray-400 p-4 bg-white rounded-lg shadow-md">이곳에는 추천 친구나 다른 사용자를 표시할 수 있습니다.</p>
                </div>

                {/* 🚨 중요: 다른 컴포넌트(Notifications.js)에서 친구 목록을 새로고침할 수 있도록
                       handleFriendUpdate 함수를 노출하는 방법이 필요하지만, 
                       현재는 동일한 파일 내에서만 사용 가능합니다.
                       실제 프로젝트에서는 Context API나 Redux/Zustand 같은 전역 상태 관리가 필요합니다. */}
            </div>
        </div>
    );
}

export default Friend;
