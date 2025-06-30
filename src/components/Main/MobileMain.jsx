import React, { useState, useEffect, useRef } from 'react';
import Layout from '../Layouts/Layout';

const MobileMain = () => {
    const [showModal, setShowModal] = useState(true);
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [isTracking, setIsTracking] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [locationHistory, setLocationHistory] = useState([]);
    const [isHistoryVisible, setIsHistoryVisible] = useState(true);
    const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 }); // 지도 이동을 위한 오프셋
    const [mapZoom, setMapZoom] = useState(1); // 지도 확대/축소
    const [mapHistory, setMapHistory] = useState([]); // 지도 이동 히스토리
    const [historyIndex, setHistoryIndex] = useState(-1); // 현재 히스토리 인덱스

    // 터치 이벤트를 위한 상태들
    const [isDragging, setIsDragging] = useState(false);
    const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 });
    const [initialDistance, setInitialDistance] = useState(0);
    const [initialZoom, setInitialZoom] = useState(1);
    const mapRef = useRef(null);

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

    // 지도 이동 함수들
    const moveMapLeft = () => {
        const newOffset = { ...mapOffset, x: mapOffset.x - 100 };
        setMapOffset(newOffset);
        addToHistory(newOffset, mapZoom);
    };

    const moveMapRight = () => {
        const newOffset = { ...mapOffset, x: mapOffset.x + 100 };
        setMapOffset(newOffset);
        addToHistory(newOffset, mapZoom);
    };

    const moveMapUp = () => {
        const newOffset = { ...mapOffset, y: mapOffset.y - 100 };
        setMapOffset(newOffset);
        addToHistory(newOffset, mapZoom);
    };

    const moveMapDown = () => {
        const newOffset = { ...mapOffset, y: mapOffset.y + 100 };
        setMapOffset(newOffset);
        addToHistory(newOffset, mapZoom);
    };

    const resetMapPosition = () => {
        const newOffset = { x: 0, y: 0 };
        setMapOffset(newOffset);
        setMapZoom(1);
        addToHistory(newOffset, 1);
    };

    // 확대/축소 함수들
    const zoomIn = () => {
        if (mapZoom < 1) {
            const newZoom = Math.min(mapZoom * 1.2, 1); // 최대 100%까지만
            setMapZoom(newZoom);
            addToHistory(mapOffset, newZoom);
        }
    };

    const zoomOut = () => {
        const newZoom = Math.max(mapZoom / 1.2, 1); // 최소 100% 유지
        setMapZoom(newZoom);
        addToHistory(mapOffset, newZoom);
    };


    // 히스토리 관리 함수들
    const addToHistory = (offset, zoom) => {
        const newState = { offset, zoom };
        const newHistory = mapHistory.slice(0, historyIndex + 1);
        newHistory.push(newState);
        setMapHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const goPrevious = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const prevState = mapHistory[newIndex];
            setMapOffset(prevState.offset);
            setMapZoom(prevState.zoom);
            setHistoryIndex(newIndex);
        }
    };

    const goNext = () => {
        if (historyIndex < mapHistory.length - 1) {
            const newIndex = historyIndex + 1;
            const nextState = mapHistory[newIndex];
            setMapOffset(nextState.offset);
            setMapZoom(nextState.zoom);
            setHistoryIndex(newIndex);
        }
    };

    // 터치 이벤트 핸들러들
    const handleTouchStart = (e) => {
        e.preventDefault();
        const touches = e.touches;

        if (touches.length === 1) {
            // 단일 터치 - 드래그 시작
            setIsDragging(true);
            setLastTouch({
                x: touches[0].clientX,
                y: touches[0].clientY
            });
        } else if (touches.length === 2) {
            // 두 손가락 터치 - 핀치 줌 시작
            const distance = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
            setInitialDistance(distance);
            setInitialZoom(mapZoom);
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        const touches = e.touches;

        if (touches.length === 1) {
            // 단일 터치 드래그 - 간단하고 직접적인 처리
            const currentTouch = {
                x: touches[0].clientX,
                y: touches[0].clientY
            };

            const deltaX = currentTouch.x - lastTouch.x;
            const deltaY = currentTouch.y - lastTouch.y;

            // 지도 위치 업데이트
            setMapOffset(prevOffset => ({
                x: prevOffset.x + deltaX,
                y: prevOffset.y + deltaY
            }));

            setLastTouch(currentTouch);
        } else if (touches.length === 2) {
            // 핀치 줌
            const distance = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );

            if (initialDistance > 0) {
                const scale = distance / initialDistance;
                const newZoom = Math.max(1, Math.min(3, initialZoom * scale)); // 최소 1로 제한
                setMapZoom(newZoom);
            }
        }
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        setIsDragging(false);
        setInitialDistance(0);

        // 현재 상태를 히스토리에 추가
        setTimeout(() => {
            addToHistory(mapOffset, mapZoom);
        }, 100);
    };

    return (
        <Layout>
            <div
                ref={mapRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    backgroundImage: 'url(/images/maps/jinyung-map.png)',
                    backgroundSize: `auto ${100 * mapZoom}%`,
                    backgroundPosition: `${mapOffset.x}px ${mapOffset.y}px`,
                    backgroundRepeat: 'no-repeat',
                    flex: 1,                      // ✅ 부모(main)의 공간을 꽉 채움
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    touchAction: 'none',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* 확대/축소 버튼들 */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '10px',
                    transform: 'translateY(-50%)',
                    zIndex: 1002
                }}>
                    <button
                        onClick={zoomOut}
                        style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'rgba(0, 123, 255, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            fontSize: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '10px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        title="축소"
                    >
                        −
                    </button>
                    <button
                        onClick={zoomIn}
                        style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'rgba(0, 123, 255, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            fontSize: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        title="확대"
                    >
                        +
                    </button>
                </div>

                {/* 이전/다음 버튼들 */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    right: '10px',
                    transform: 'translateY(-50%)',
                    zIndex: 1002
                }}>
                    <button
                        onClick={goPrevious}
                        disabled={historyIndex <= 0}
                        style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: historyIndex <= 0 ? 'rgba(108, 117, 125, 0.5)' : 'rgba(40, 167, 69, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            fontSize: '16px',
                            cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '10px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        title="이전"
                    >
                        ◀
                    </button>
                    <button
                        onClick={goNext}
                        disabled={historyIndex >= mapHistory.length - 1}
                        style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: historyIndex >= mapHistory.length - 1 ? 'rgba(108, 117, 125, 0.5)' : 'rgba(40, 167, 69, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            fontSize: '16px',
                            cursor: historyIndex >= mapHistory.length - 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        title="다음"
                    >
                        ▶
                    </button>
                </div>

                {/* 중앙 리셋 버튼 */}
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1002
                }}>
                    <button
                        onClick={resetMapPosition}
                        style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'rgba(108, 117, 125, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        title="중앙으로 이동"
                    >
                        ⌂
                    </button>
                </div>

                {/* 확대/축소 정보 표시 */}
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    zIndex: 1002
                }}>
                    확대: {Math.round(mapZoom * 100)}%
                </div>

                {/* <h6 style={{margin:0,textAlign:'left'}}>모바일 메인 화면</h6> */}
                {isTracking ? (
                    <>
                        <div
                            style={{
                                fontSize: '10px',
                                display: 'flex',
                                gap: '10px',
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
                            <div
                                style={{
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
                                    zIndex: 1001,
                                    touchAction: 'auto',
                                    pointerEvents: 'auto'
                                }}
                                onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                                onTouchStart={() => setIsHistoryVisible(!isHistoryVisible)}
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