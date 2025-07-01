import React from 'react';
import styles from './Layout.module.css';
import Header from './Header';
import Footer from './Footer';



const Layout = ({ children }) => {
return (
<div className={styles.layoutWrapper}>
<div className={styles.header}><Header /></div>
<main className={styles.main}>{children}</main>
{/* <div className={styles.footer}><Footer /></div> */}
</div>
);
};

export default Layout;