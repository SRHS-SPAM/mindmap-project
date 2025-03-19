"use client"

import { Button } from "@/components/ui/button"
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';


export default function Sign_In() {
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const router = useRouter();


    const getCSRFToken = () => {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.startsWith('csrftoken=')) {
            return cookie.substring('csrftoken='.length, cookie.length);
          }
        }
        return ""; // 토큰이 없으면 빈 문자열 반환
    };

    const handleSubmit = async (action : string) => {
        const requestData = {
        action,
        password,
        email,
        username,
        };

        try {
            const csrftoken = getCSRFToken();
            const response = await fetch('http://localhost:8000/api/user/', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken, // CSRF 토큰 추가
                },
                body: JSON.stringify(requestData),
                credentials: 'include', 
            });

            const result = await response.json();

            if (response.ok && result.success) { // 성공 여부 확인
                setMessage(result.message); // 성공 메시지
                router.push('/sign_in/sign_in_good'); // 성공 시 이동할 페이지
            } else {
                setMessage(`Error: ${result.message}`); // 실패 메시지 (result.message가 없을 경우 대비)
            }
        } catch (error) {
            console.error('Error:', error);
            setMessage('서버와의 통신 중 오류가 발생했습니다.');
        }
    };




  return (
    <div className="px-5 w-{100vw} h-{100vh} bg-[#CCD4EE]">
        <div className="w-full justify-center items-center">
            <p className="text-7xl text-[#666A77] font-bold">회원가입</p>
        </div>
        

        <p className="w-full h-auto mt-24 text-base">이메일을 입력해 주세요</p>
        <input className="w-full h-12 mt-2 px-4 text-sm text-[#C299AB] bg-white rounded-full focus:outline-none " 
        type="email" 
        placeholder="여기에 이메일을 입력해 주세요" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        />

         <p className="w-full h-auto mt-5 text-base">비밀번호를 입력해 주세요</p>
        <input className="w-full h-12 mt-2 px-4 text-sm text-[#C299AB] bg-white rounded-full focus:outline-none " 
        type="password" 
        placeholder="여기에 비밀번호를 입력해 주세요" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        />

        <p>{message}</p>

        <div className="flex justify-center w-full pt-5 h-8">
            <Link href="/sign_in/sign_idk" className="text-pink-500 w-auto text-xs font-bold">비밀번호/이메일이 기억나지 않나요?</Link>
        </div>
        
        <div className="w-full h-[15rem] pt-40">
             {/* Link 제거, onClick 핸들러 추가 */}
                <Button variant="outline" 
                        className="border-[#C299AB] w-full h-12 border-2 rounded-3xl text-[#FF70BA] font-extrabold"
                        onClick={() => handleSubmit('login')}> {/* action 값 전달 */}
                    로그인하기
                </Button>
        </div>

    </div>
        
  );
}
