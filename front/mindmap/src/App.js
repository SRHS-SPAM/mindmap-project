import React from 'react';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';

import './App.css';

// 페이지 컴포넌트 불러오깅
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/main" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/friend" element={<FriendPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/mind" element={<MindMapPage />} />
        <Route path="/memo" element={<MemoPage />} />
        <Route path="/notification" element={<NotificationPage />} />
         <Route path="/info" element={<InfoPage />} />
      </Routes>
    </Router>
  );
}

export default App;
