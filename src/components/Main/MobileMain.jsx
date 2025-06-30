import React, { useState, useEffect } from 'react';
import Layout from '../Layouts/Layout';

const MobileMain = () => {
    const [showModal, setShowModal] = useState(true);
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [isTracking, setIsTracking] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [locationHistory, setLocationHistory] = useState([]);
    const [isHistoryVisible, setIsHistoryVisible] = useState(true);

    // 100개의 더미 위치 데이터 생성 (서울 시청 주변을 중심으로 한 동선)
    const dummyLocations = Array.from({ length: 100 }, (_, index) => {
        const baseLat = 37.5665;
        const baseLng = 126.9780;
        // 원형 경로로 이동하는 것처럼 시뮬레이션
        const angle = (index / 100) * 2 * Math.PI;
        const radius = 0.01; // 약 1km 반경

        // 10초 단위로 시간 표시 (5초마다 업데이트하지만 10초 단위로 표시)
        const currentTime = new Date();
        const seconds = Math.floor(currentTime.getSeconds() / 10) * 10; // 10초 단위로 반올림
        const adjustedTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(),
            currentTime.getHours(), currentTime.getMinutes(), seconds + (index * 5));

        return {
            id: index + 1,
            lat: baseLat + radius * Math.cos(angle),
            lng: baseLng + radius * Math.sin(angle),
            timestamp: adjustedTime.toLocaleTimeString()
        };
    });

    useEffect(() => {
        if (isTracking && currentIndex < dummyLocations.length) {
            const timer = setTimeout(() => {
                const currentLocation = dummyLocations[currentIndex];
                setLocation({ lat: currentLocation.lat, lng: currentLocation.lng });
                setLocationHistory(prev => [...prev, currentLocation]);
                setCurrentIndex(prev => prev + 1);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [isTracking, currentIndex, dummyLocations.length]);

    const handleConsent = () => {
        setShowModal(false);
        setIsTracking(true);
        setCurrentIndex(0);
        setLocationHistory([]);
    };

    const handleDecline = () => {
        setShowModal(false);
        setIsTracking(false);
    };

    return (
        <Layout>
            <div style={{
                backgroundImage: 'url(/images/maps/jinyoung-map.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                height: '100vh',
                width: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* <h6 style={{margin:0,textAlign:'left'}}>모바일 메인 화면</h6> */}
                {isTracking ? (
                    <>
                        <div 
                            style={{
                                fontSize : '10px',
                                display:'flex',
                                gap:'10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                padding: '10px',
                                borderRadius: '5px',
                                margin: '10px'
                            }}
                        >
                            <p>실시간 위치 정보:</p>
                            <p>위도: {location.lat?.toFixed(6)}</p>
                            <p>경도: {location.lng?.toFixed(6)}</p>
                            <p>현재 위치: {currentIndex} / {dummyLocations.length}</p>
                        </div>

                        <div
                            style={{
                                marginTop: '20px',
                                width: '120px',
                                height: '200px',
                                position: 'absolute',
                                right: isHistoryVisible ? '0' : '-120px',
                                bottom: '40px',
                                maxHeight: '200px',
                                transition: 'right 0.3s ease-in-out',
                                backgroundColor: 'white',
                                border: '1px solid #ccc',
                                borderRadius: '5px 0 0 5px',
                                boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                left: '-20px',
                                top: '100px',
                                width: '20px',
                                height: '40px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                borderRadius: '5px 0 0 5px',
                                fontSize: '12px',
                                zIndex: 1001
                            }}
                                onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                            >
                                {isHistoryVisible ? '◀' : '▶'}
                            </div>

                            {isHistoryVisible && (
                                <div >
                                    <h6 style={{ marginBottom: '5px', marginTop: '5px', backgroundColor: '#f0f8ff', padding: "5px 0" }}>
                                        위치 기록 ({locationHistory.length}개)
                                    </h6>
                                    <div style={{
                                        height: "calc(100vh - 330px)",
                                        maxHeight: "120px",
                                        overflowY: 'auto',
                                        fontSize: "5px",
                                        padding: "0 5px"
                                    }}>
                                        {locationHistory.slice().reverse().map((loc, index) => (
                                            <div key={loc.id} style={{
                                                padding: '8px',
                                                borderBottom: index < locationHistory.length - 1 ? '1px solid #eee' : 'none',
                                                backgroundColor: index === 0 ? '#f0f8ff' : 'transparent',
                                            }}>
                                                <strong>위치 {loc.id}</strong> - {loc.timestamp}
                                                <br />
                                                위도: {loc.lat.toFixed(6)}, 경도: {loc.lng.toFixed(6)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <p>위치 추적이 비활성화되어 있습니다.</p>
                )}
            </div>

            {/* 위치 추적 동의 모달 */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        maxWidth: '300px',
                        textAlign: 'center',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h3>위치 추적 동의</h3>
                        <p>실시간 위치 추적에 동의하십니까?</p>
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'center',
                            marginTop: '20px'
                        }}>
                            <button
                                onClick={handleConsent}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                확인
                            </button>
                            <button
                                onClick={handleDecline}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                거부
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default MobileMain;