import React from 'react';
import { FiSettings, FiLogOut } from 'react-icons/fi';
import styles from './Layout.module.css';

const Header = ({ onLogout }) => {
    return (
        <header className={styles.header}>
            <div className={styles.headerLeft}>
                <div className={styles.logo}>
                    LOGO
                </div>
                <h1 className={styles.title}>철도 작업자 관리 모니터링</h1>
            </div>
            <div className={styles.headerRight}>
                <button className={styles.headerButton} title="설정">
                    <FiSettings size={18} />
                </button>
                <button 
                    className={styles.headerButton} 
                    onClick={onLogout}
                    title="로그아웃"
                >
                    <FiLogOut size={18} />
                </button>
            </div>
        </header>
    );
};

export default Header;