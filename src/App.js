import logo from './logo.svg';
import './App.css';

import React, { useState } from 'react';
import MainSelector from './components/MainSelector';
import Login from './Login';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <div className="App">
        {!isLoggedIn ? (
            <Login onLogin={handleLogin} />
        ) : (
            <MainSelector />
        )}
    </div>
  );
}

export default App;
