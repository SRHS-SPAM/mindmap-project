import React, { useState, useEffect, useCallback } from 'react';
import Header from "../component/Header";
import { Check, X } from 'lucide-react';
import axios from 'axios';
import './HomePage.css'; // 스타일 파일 임포트

// 🚨 백엔드 경로: http://localhost:8000/api/v1/user/user
const BASE_URL = 'http://localhost:8000/api/v1/user/user';

// 친구 신청 알림 카드 컴포넌트
const NotificationCard = ({ notification, onAction }) => {
    const { id, sender_name, sender_friend_code } = notification;

    return (
        <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm mb-3 border border-gray-100">
            <div className="flex flex-col">
                <p className="text-gray-800 font-semibold">{sender_name}님에게서 친구 요청이 도착했습니다.</p>
                <p className="text-gray-500 text-sm">코드: {sender_friend_code}</p>
            </div>
            <div className="flex space-x-2">
                {/* 수락 버튼 */}
                <button 
                    onClick={() => onAction(id, 'accept')}
                    className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white transition duration-150 shadow-md focus:outline-none focus:ring-2 focus:ring-green-400"
                    aria-label="친구 요청 수락"
                >
                    <Check size={20} />
                </button>
                {/* 거절 버튼 */}
                <button 
                    onClick={() => onAction(id, 'reject')}
                    className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition duration-150 shadow-md focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label="친구 요청 거절"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

const NotificationPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);

    // 알림 목록을 API에서 가져오는 함수
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        setStatusMessage(null);
        try {
            const token = sessionStorage.getItem('access_token');
            if (!token) {
                setError("로그인이 필요합니다.");
                setLoading(false);
                return;
            }

            // GET /api/v1/user/user/friends/requests
            const response = await axios.get(`${BASE_URL}/friends/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setNotifications(response.data);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            setError("알림 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, []);

    // 친구 요청 수락/거절을 처리하는 함수
    const handleAction = useCallback(async (friendshipId, action) => {
        setStatusMessage(null);
        try {
            const token = sessionStorage.getItem('access_token');

            // POST /api/v1/user/user/friends/action
            await axios.post(`${BASE_URL}/friends/action`, {
                friendship_id: friendshipId,
                action: action 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStatusMessage(action === 'accept' ? "친구 요청을 수락했습니다." : "친구 요청을 거절했습니다.");
            
            // 처리 후 목록을 새로고침
            fetchNotifications();

        } catch (err) {
            console.error(`Failed to ${action} request:`, err);
            setStatusMessage(`요청 처리 실패: ${err.response?.data?.detail || '서버 오류'}`);
        }
    }, [fetchNotifications]);
    
    // 컴포넌트 로드 시 알림 가져오기
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);


    return(
        <div className="wrap_ho min-h-screen bg-gray-50">
            <Header />
            <div className='p-6 max-w-4xl mx-auto'>
                <h1 className='text-3xl font-bold text-gray-800 mb-6'>친구 요청 알림</h1>
                
                {statusMessage && (
                    <div className={`p-3 mb-4 rounded-lg text-sm font-medium ${statusMessage.includes('실패') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {statusMessage}
                    </div>
                )}

                {loading && (
                    <div className="text-center p-10 text-gray-500">알림을 불러오는 중입니다...</div>
                )}
                
                {error && (
                    <div className="text-center p-10 text-red-500 font-medium">{error}</div>
                )}

                {!loading && !error && (
                    notifications.length > 0 ? (
                        <div className="space-y-3">
                            {notifications.map(noti => (
                                <NotificationCard key={noti.id} notification={noti} onAction={handleAction} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-10 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                            현재 대기 중인 친구 요청이 없습니다.
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default NotificationPage;
