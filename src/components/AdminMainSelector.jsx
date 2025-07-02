import React from 'react';
import WebMain from './Main/WebMain';
// import MobileMain from './Main/MobileMain';

const MainSelector = ({ onLogout }) => {
    const isMobile = window.innerWidth <= 768;
    // return isMobile ? <MobileMain /> : <WebMain />;
    return <WebMain onLogout={onLogout} />;
};

export default MainSelector;
