import React from 'react';
import { CircleUserRound } from 'lucide-react';

/**
 * 개별 친구의 온라인 상태와 정보를 표시하는 컴포넌트입니다.
 * @param {object} friend - 친구 정보 (id, name, email, is_online 포함)
 */
const Friends = ({ friend }) => {
    // friend 객체에서 is_online 상태와 표시할 이름을 추출합니다.
    const isOnline = friend.is_online; 
    const statusClass = isOnline ? 'bg-green-500' : 'bg-gray-400';
    const displayName = friend.name || friend.email;

    return(
        // 'friend' 클래스 대신 Tailwind 클래스를 사용하여 스타일링
        <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-md border border-gray-200 w-full hover:shadow-lg transition">
            
            {/* 프로필 이미지/아이콘 */}
            <div className="relative mb-2">
                <CircleUserRound className="w-10 h-10 text-indigo-500"/>
                {/* 온라인 상태 표시 (우측 하단 작은 원) */}
                <div 
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusClass}`}
                    title={isOnline ? "접속 중" : "오프라인"}
                ></div>
            </div>
            
            {/* 사용자 이름/이메일 */}
            <p className="text-gray-700 text-sm font-medium truncate max-w-full">
                {displayName}
            </p>
            {/* 접속 상태 텍스트 (옵션) */}
            <p className="text-xs text-gray-400">
                {isOnline ? 'ONLINE' : 'OFFLINE'}
            </p>
        </div>
    );
}

export default Friends;
