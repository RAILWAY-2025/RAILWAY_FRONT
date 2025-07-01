import React from 'react';

const Main = ({ children }) => {
    return (
        <main style={{ minHeight: '60vh', padding: '1rem' }}>
            {children}
        </main>
    );
};

export default Main;