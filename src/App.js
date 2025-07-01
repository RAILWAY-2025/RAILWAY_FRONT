import logo from './logo.svg';
import './App.css';

import React, { useState } from 'react';
import MainSelector from './components/AdminMainSelector';
import Login from './Login';
import WorkerMain from './components/Main/WorkerMain';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(''); // 'worker' or 'admin'

  const handleLogin = (formData) => {
    setIsLoggedIn(true);
    // 간단한 로직: ID에 'worker'가 포함되면 작업자, 아니면 관리자
    if (formData.id.toLowerCase().includes('worker')) {
      setUserType('worker');
    } else {
      setUserType('admin');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserType('');
  };

  // 작업자 화면
  if (isLoggedIn && userType === 'worker') {
    return (
      <div className="App">
        <WorkerMain onLogout={handleLogout} />
      </div>
    );
  }

  // 관리자 화면
  if (isLoggedIn && userType === 'admin') {
    return (
      <div className="App">
        <MainSelector onLogout={handleLogout} />
      </div>
    );
  }

  // 로그인 화면
  return (
    <div className="App">
      <Login onLogin={handleLogin} />
    </div>
  );
}

export default App;
