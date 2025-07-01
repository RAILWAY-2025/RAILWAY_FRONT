import React from 'react';
import { FiSettings, FiLogOut } from 'react-icons/fi';
import styles from './Layout.module.css';

const Header = ({ onLogout }) => {
    const handleSettings = () => {
        console.log('설정 버튼 클릭');
        // 설정 기능 구현
    };

    const handleLogout = () => {
        console.log('로그아웃 버튼 클릭');
        if (onLogout) {
            onLogout();
        }
    };

    return (
        <header className={styles.header}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '0 15px'
            }}>
                <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#333'
                }}>
                    작업자 님 환영합니다.
                </div>
                
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={handleSettings}
                        style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="설정"
                    >
                        <FiSettings size={16} />
                    </button>
                    
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="로그아웃"
                    >
                        <FiLogOut size={16} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;