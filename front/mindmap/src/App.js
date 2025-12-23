import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import './App.css';

// 페이지 컴포넌트 불러오기
import MainPage from './page/MainPage';
import LoginPage from './page/SigninPage';
import SignUpPage from './page/SignUpPage';
import HomePage from './page/HomePage';
import FriendPage from './page/FriendPage';
import AboutPage from './page/AboutPage';
import MemoPage from './page/MemoPage';
import MindMapPage from './page/MindMapPage';
import NotificationPage from './page/NotificationPage';
import InfoPage from './page/InfoPage';

// 💡 API 설정
const BACKEND_BASE_URL = 'https://mindmap-697550966480.asia-northeast3.run.app';
const API_VERSION_PREFIX = '/api/v1';

// 💡 보호된 라우트 컴포넌트 (로그인 필요)
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const authToken = sessionStorage.getItem('access_token');

  useEffect(() => {
    // 토큰이 없으면 즉시 로그인 페이지로 이동
    if (!authToken) {
      console.log('❌ 토큰 없음 - 로그인 페이지로 이동');
      navigate('/main', { replace: true });
      return;
    }

    // 토큰 유효성 검사 (백엔드 /auth/me 엔드포인트 호출)
    const verifyToken = async () => {
      try {
        await axios.get(`${BACKEND_BASE_URL}${API_VERSION_PREFIX}/auth/me`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('✅ 토큰 유효성 검사 통과');
      } catch (error) {
        console.error('❌ 토큰 만료 또는 유효하지 않음:', error.response?.status);
        
        // 401 Unauthorized 또는 기타 인증 오류 시 로그아웃 처리
        if (error.response?.status === 401 || error.response?.status === 403) {
          sessionStorage.removeItem('access_token');
          alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
          navigate('/main', { replace: true });
        }
      }
    };

    verifyToken();
  }, [authToken, navigate, location.pathname]);

  // 토큰이 없으면 렌더링하지 않음 (useEffect에서 이미 리다이렉트 처리)
  if (!authToken) {
    return null;
  }

  return children;
};

// 💡 Axios 인터셉터 설정 (전역 토큰 만료 처리)
const setupAxiosInterceptors = (navigate) => {
  axios.interceptors.response.use(
    (response) => response, // 정상 응답은 그대로 반환
    (error) => {
      // 401 Unauthorized 에러 발생 시 자동 로그아웃
      if (error.response?.status === 401) {
        console.error('🚨 Axios 인터셉터: 401 에러 감지 - 자동 로그아웃');
        sessionStorage.removeItem('access_token');
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        navigate('/main', { replace: true });
      }
      return Promise.reject(error);
    }
  );
};

// 💡 인터셉터 설정을 위한 래퍼 컴포넌트
const AppContent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setupAxiosInterceptors(navigate);
  }, [navigate]);

  return (
    <Routes>
      {/* 공개 라우트 (로그인 불필요) */}
      <Route path="/main" element={<MainPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      
      {/* 보호된 라우트 (로그인 필요) */}
      <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/friend" element={<ProtectedRoute><FriendPage /></ProtectedRoute>} />
      <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
      <Route path="/mind/:projectId" element={<ProtectedRoute><MindMapPage /></ProtectedRoute>} />
      <Route path="/memo" element={<ProtectedRoute><MemoPage /></ProtectedRoute>} />
      <Route path="/notification" element={<ProtectedRoute><NotificationPage /></ProtectedRoute>} />
      <Route path="/info" element={<ProtectedRoute><InfoPage /></ProtectedRoute>} />
      
      {/* 기본 경로 리다이렉트 */}
      <Route path="/" element={<Navigate to="/main" replace />} />
      <Route path="*" element={<Navigate to="/main" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;