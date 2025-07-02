import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
    const [formData, setFormData] = useState({
        id: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Login attempt:', formData);
        // 로그인 버튼 클릭 시 Main 화면으로 이동
        onLogin(formData);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                {/* 로고 영역 */}
                <div className="logo-section">
                    <div className="logo-circle">
                        <span className="logo-text">R</span>
                    </div>
                    <p className="app-subtitle" style={{textAlign:"right" ,fontSize:".7rem"}}>Saft City</p>
                    <h1 className="app-title"> 
                        {/* <span> 여기 아이콘 </span> */}
                        철도작업알림 시스템
                    </h1>
                    
                </div>

                {/* 로그인 폼 */}
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <div className="input-wrapper">
                            <input
                                type="text"
                                name="id"
                                value={formData.id}
                                onChange={handleInputChange}
                                placeholder="아이디"
                                className="login-input"
                                required
                            />
                            <div className="input-icon">
                                {/* <span>-</span> */}
                            </div>
                        </div>
                    </div>

                    <div className="input-group">
                        <div className="input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="비밀번호"
                                className="login-input"
                                required
                            />
                            <div className="input-icon">
                                <span></span>
                            </div>
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '-' : '+'}
                            </button>
                        </div>
                    </div>

                    {/* 로그인 옵션 */}
                    <div className="login-options">
                        <label className="remember-me">
                            <input type="checkbox" />
                            <span>로그인 상태 유지</span>
                        </label>
                        <a href="#" className="forgot-password">비밀번호 찾기</a>
                    </div>

                    {/* 로그인 버튼 */}
                    <button type="submit" className="login-button">
                        로그인
                    </button>

                    {/* 회원가입 링크 */}
                    <div className="signup-section">
                        <p>계정이 없으신가요?</p>
                        <a href="#" className="signup-link">회원가입</a>
                    </div>
                </form>

                {/* 소셜 로그인 */}
                <div className="social-login">
                    <div className="divider">
                        {/* <span>또는</span> */}
                    </div>
                    <div className="social-buttons">
                        <button className="social-button google">
                            <span>🔍</span>
                            Google
                        </button>
                        <button className="social-button kakao">
                            <span>💬</span>
                            Kakao
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login; 