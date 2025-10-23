import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import "./SignPage.css"

// TODO: 실제 FastAPI 백엔드 주소로 변경하세요.
const API_BASE_URL = 'http://localhost:8000'; 

// 이 컴포넌트는 외부 API를 호출하는 로직에 집중합니다.

const LoginPage = () => {
    const navigate = useNavigate();
    
    // 1. 상태 관리: 이메일(ID), 비밀번호, 에러 메시지
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 2. 로그인 처리 함수
    const handleLogin = useCallback(async (e) => {
        e.preventDefault(); // 폼 제출 시 페이지 새로고침 방지
        setError('');
        setIsLoading(true);

        // FastAPI 백엔드의 login 엔드포인트 호출
        try {
            // Note: FastAPI는 JSON body에 { "email": "...", "password": "..." } 형식을 기대합니다.
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // 3. 성공: JWT 토큰 저장 및 홈으로 이동
                localStorage.setItem('access_token', data.access_token);
                console.log("Login successful. Token stored:", data.access_token);
                navigate('/home');
            } else {
                // 4. 실패: 에러 메시지 표시
                const errorMessage = data.detail || '로그인에 실패했습니다. ID와 비밀번호를 확인해주세요.';
                setError(errorMessage);
            }
        } catch (err) {
            // 네트워크 오류 등 예외 처리
            console.error('Login Error:', err);
            setError('네트워크 오류가 발생했습니다. 서버 연결 상태를 확인해주세요.');
        } finally {
            setIsLoading(false);
        }
    }, [email, password, navigate]);
    

    return (
        <>
            {/* 기존 클래스 이름 적용: wrap_s */}
            <div className="wrap_s">
                {/* 기존 클래스 이름 적용: text_wrap_s */}
                <div className='text_wrap_s'>
                    {/* 기존 클래스 이름 적용: main_text_s */}
                    <h1 className='main_text_s'>SIGN IN</h1>
                    
                    {/* 폼 제출을 위한 form 태그와 이벤트 핸들러 추가 */}
                    <form onSubmit={handleLogin}>
                        {/* 기존 클래스 이름 적용: in_wrap */}
                        <div className="in_wrap">
                            {/* ID (Email) Input - type="email"로 변경 */}
                            <input
                                type="email" 
                                id="email"
                                className="in" // 기존 클래스 이름 적용
                                placeholder="EMAIL"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            {/* Password Input - type="password"로 변경 */}
                            <input
                                type="password" 
                                id="password"
                                className="in" // 기존 클래스 이름 적용
                                placeholder="PASSWORLD"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        
                        {/* 에러 메시지 표시 */}
                        {error && (
                            <div className="error-message">
                                <p>{error}</p>
                            </div>
                        )}

                        {/* 기존 클래스 이름 적용: add */}
                        <div className="add">
                            <p onClick={() => navigate('/signup')}>SignUp</p>
                            {/* Find ID/Pass는 현재 기능이 없으므로 비활성화된 것처럼 처리 */}
                            <p style={{ opacity: 0.6, cursor: 'default' }}>Find ID</p>
                            <p style={{ opacity: 0.6, cursor: 'default' }}>Find Pass</p>
                        </div>
                        
                        {/* 로그인 버튼 - type="submit"으로 변경 및 로딩 상태/비활성화 처리 */}
                        {/* 기존 클래스 이름 적용: go_s */}
                        <button type="submit" className='go_s' disabled={isLoading}>
                            {/* 기존 클래스 이름 적용: sub_text */}
                            <p className='sub_text'>
                                {isLoading ? '로그인 중...' : 'Login >'}
                            </p>
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

export default LoginPage;
