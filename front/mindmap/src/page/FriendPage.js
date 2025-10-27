import React, { useState, useCallback } from "react"; 
import Header from "../component/Header";
import Friends from "../component/Friends";
import { Search } from "lucide-react";
import axios from 'axios'; 

// 🚨 수정: 백엔드의 중첩된 경로(`/api/v1/user/user/`)에 맞게 BASE_URL을 설정합니다.
const BASE_URL = 'http://localhost:8000/api/v1/user/user'; 


// 검색 결과를 표시할 컴포넌트 
const FoundFriendCard = ({ user, onAddFriend }) => {
    return (
        <div className="found_friend_card">
            {/* 프로필 이미지 목업 */}
            <div className="friend_profile_img">👤</div> 
            <div className="friend_info">
                {/* 이름 표시 */}
                <p className="friend_name">{user.name}</p>
                {/* 친구 코드 표시 */}
                <p className="friend_code_display">Code: {user.friend_code}</p> 
            </div>
            {/* 친구 신청 버튼 */}
            {/* 🚨 수정: 친구 요청을 위해 user.friend_code를 전달합니다. */}
            <button className="add_friend_btn" onClick={() => onAddFriend(user.friend_code)}>
                신청하기
            </button>
        </div>
    );
};


const Friend = () => {
    const [searchCode, setSearchCode] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [searchError, setSearchError] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null); // 상태 메시지용 추가

    const searchFriend = useCallback(async () => {
        setSearchError(null);
        setFoundUser(null);
        setStatusMessage(null); // 검색 시 상태 메시지 초기화
        
        const code = searchCode.toUpperCase().trim();

        if (code.length !== 7) {
            setSearchError("친구 코드는 정확히 7자리여야 합니다.");
            return;
        }

        try {
            const token = localStorage.getItem('access_token'); 
            
            // 최종 요청 경로: http://localhost:8000/api/v1/user/user/search
            const response = await axios.get(
                `${BASE_URL}/search?friend_code=${code}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setFoundUser(response.data);
            setStatusMessage(`사용자 "${response.data.name}"를 찾았습니다.`);

        } catch (error) {
            console.error("Search error:", error);
            setFoundUser(null); // 에러 시 결과 초기화
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

    // 🚨 수정: 친구 요청 API 호출 로직 구현
    const handleAddFriend = useCallback(async (friendCode) => {
        setStatusMessage(null); // 상태 메시지 초기화
        if (!friendCode) return;

        try {
            const token = localStorage.getItem('access_token');
            
            // 제공해주신 경로를 사용하여 친구 요청 POST
            await axios.post(
                `${BASE_URL}/friends/add`, // /api/v1/user/user/friends/add
                { friend_code: friendCode }, // 요청 시 필요한 데이터 (스키마 가정)
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            
            setStatusMessage(`친구 코드 ${friendCode}에게 친구 요청을 성공적으로 보냈습니다!`);
            setFoundUser(null); // 요청 성공 후 검색 결과 초기화

        } catch (error) {
            console.error("Add friend error:", error);
            let message = "친구 요청에 실패했습니다.";
            if (error.response) {
                 message = error.response.data.detail || message;
                 if (error.response.status === 400) {
                    // 예: "Already friends" 또는 "Friend request already sent"
                    message = error.response.data.detail;
                 }
            }
            // alert() 대신 상태 메시지를 사용합니다.
            setStatusMessage(`요청 실패: ${message}`); 
        }
    }, []); 

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            searchFriend();
        }
    };

    return(
        <div className="wrap_f">
            <Header />
            <div className="info">
                <div className='text_wrap_f'>
                    <h1 className='main_text_f'>Friend</h1>
                    
                    {/* 검색창 영역 */}
                    <div className='search_input_wrap'>
                        <input 
                            type="text"
                            placeholder="친구 코드로 검색 (예: A1B2C3D)"
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                            onKeyDown={handleKeyDown}
                            maxLength={7}
                            className="search_input_field"
                        />
                        <Search className="search_icon" onClick={searchFriend} />  
                    </div>

                    {/* 상태 메시지 영역 */}
                    {statusMessage && <p className="status_message text-green-600 font-bold mt-2">{statusMessage}</p>}


                    {/* 검색 결과 표시 영역 */}
                    <div className="search_result_area">
                        {searchError && <p className="search_error_message text-red-500">{searchError}</p>}
                        
                        {foundUser && (
                            <FoundFriendCard user={foundUser} onAddFriend={handleAddFriend} />
                        )}

                        {!foundUser && !searchError && searchCode && searchCode.length === 7 && (
                            <p className="search_guide_message">검색 버튼을 눌러 결과를 확인하세요.</p>
                        )}
                        
                    </div>
                    
                    <p className="sub_text_f">(12)</p>             
                </div>
                
                {/* 기존 친구 목록 및 다른 사용자 목록 */}
                <div className="people_wrap">
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                </div>
                <p className="sub_text_f">OTHER PEOPLE</p>
                <div className="opeople_wrap">
                    <Friends /><Friends /><Friends /><Friends />
                    <Friends /><Friends /><Friends /><Friends />
                    <Friends /><Friends /><Friends /><Friends />
                </div>
            </div>
        </div>
    );
}

export default Friend;
