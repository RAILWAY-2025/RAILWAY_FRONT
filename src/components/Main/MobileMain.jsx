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

    // 이미지 원본 사이즈
    const imageSize = { width: 1920, height: 1080 };

    // 사람 위치 점의 이동을 위한 상태
    const [personPosition, setPersonPosition] = useState({ x: 0, y: 0 });
    const [movementPath, setMovementPath] = useState([]); // 이동 경로 저장
    const [movementDirection, setMovementDirection] = useState(0); // 이동 방향 (각도)

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
                
                // 사람 위치 점 이동 (위치 기록 시마다)
                const moveX = (Math.random() - 0.5) * 20; // -10 ~ +10px 랜덤 이동
                const moveY = (Math.random() - 0.5) * 20; // -10 ~ +10px 랜덤 이동
                
                const newPosition = {
                    x: personPosition.x + moveX,
                    y: personPosition.y + moveY
                };
                
                setPersonPosition(newPosition);
                
                // 이동 경로에 현재 위치 추가
                setMovementPath(prev => [...prev, newPosition]);
                
                // 이동 방향 계산 (각도)
                const angle = Math.atan2(moveY, moveX) * 180 / Math.PI;
                setMovementDirection(angle);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [isTracking, currentIndex, dummyLocations.length]);

    const handleConsent = () => {
        setShowModal(false);
        setIsTracking(true);
        setCurrentIndex(0);
        setLocationHistory([]);
        setPersonPosition({ x: 0, y: 0 }); // 사람 위치 초기화
        setMovementPath([]); // 이동 경로 초기화
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
            setMapOffset({ x: 0, y: 0 }); // 중앙으로 고정
            addToHistory({ x: 0, y: 0 }, newZoom);
        }
    };

    const zoomOut = () => {
        const newZoom = Math.max(mapZoom / 1.2, 1); // 최소 100% 유지
        setMapZoom(newZoom);
        setMapOffset({ x: 0, y: 0 }); // 중앙으로 고정
        addToHistory({ x: 0, y: 0 }, newZoom);
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
            setIsDragging(true);
            setLastTouch({
                x: touches[0].clientX,
                y: touches[0].clientY
            });
        } else if (touches.length === 2) {
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
            const currentTouch = {
                x: touches[0].clientX,
                y: touches[0].clientY
            };

            const deltaX = currentTouch.x - lastTouch.x;
            const deltaY = currentTouch.y - lastTouch.y;

            const container = mapRef.current;
            const containerWidth = container?.offsetWidth || 0;
            const containerHeight = container?.offsetHeight || 0;

            const scaledWidth = imageSize.width * mapZoom;
            const scaledHeight = imageSize.height * mapZoom;

            const maxOffsetX = Math.max(0, (scaledWidth - containerWidth) / 2);
            const maxOffsetY = Math.max(0, (scaledHeight - containerHeight) / 2);

            let newX = mapOffset.x + deltaX;
            let newY = mapOffset.y + deltaY;

            // 화면보다 이미지가 작을 경우 이동 제한
            if (scaledWidth <= containerWidth) newX = 0;
            if (scaledHeight <= containerHeight) newY = 0;

            const limitedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX));
            const limitedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newY));

            setMapOffset({ x: limitedX, y: limitedY });
            setLastTouch(currentTouch);
        } else if (touches.length === 2) {
            const distance = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );

            if (initialDistance > 0) {
                const scale = distance / initialDistance;
                const calculatedZoom = initialZoom * scale;

                if (calculatedZoom >= 1) {
                    const newZoom = Math.min(3, calculatedZoom);
                    setMapZoom(newZoom);
                    setMapOffset({ x: 0, y: 0 });
                }
            }
        }
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        setIsDragging(false);
        setInitialDistance(0);
    };


    return (
        <Layout>
            <div
                ref={mapRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    backgroundImage: `url(${process.env.PUBLIC_URL}/images/maps/jinyung-map.png)`,
                    backgroundSize: `auto ${100 * mapZoom}%`,
                    backgroundPosition: `${mapOffset.x}px ${mapOffset.y}px`,
                    backgroundRepeat: 'no-repeat',
                    width: '100%',
                    height: '100vh',
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


                </div>

                {/* 이전/다음 버튼들 */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    right: '10px',
                    transform: 'translateY(-50%)',
                    zIndex: 1002
                }}>

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
                    zIndex: 1002,
                    transform: `translate(${mapOffset.x}px, ${mapOffset.y}px)`
                }}>
                    확대: {Math.round(mapZoom * 100)}%
                </div>

                {/* 사람 위치 표시 점 */}
                {isTracking && (
                    <div style={{
                        position: 'absolute',
                        top: `calc(50% + ${personPosition.y + mapOffset.y}px)`,
                        left: `calc(50% + ${personPosition.x + mapOffset.x}px)`,
                        width: '10px',
                        height: '10px',
                        backgroundColor: 'red',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1001,
                        boxShadow: '0 0 8px rgba(255, 0, 0, 0.8), 0 0 16px rgba(255, 0, 0, 0.4)',
                        animation: 'pulse 2s infinite',
                        border: '2px solid rgba(255, 255, 255, 0.8)',
                        transition: 'top 0.5s ease, left 0.5s ease'
                    }} />
                )}

                {/* 이동 방향 화살표 */}
                {isTracking && (
                    <div style={{
                        position: 'absolute',
                        top: `calc(50% + ${personPosition.y + mapOffset.y}px)`,
                        left: `calc(50% + ${personPosition.x + mapOffset.x}px)`,
                        width: '0',
                        height: '0',
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderBottom: '10px solid red',
                        transform: `translate(-50%, -50%) rotate(${movementDirection}deg) translateY(-15px)`,
                        zIndex: 1000,
                        transition: 'transform 0.5s ease',
                        filter: 'drop-shadow(0 0 4px rgba(255, 0, 0, 0.6))'
                    }} />
                )}

                {/* 이동 경로 대시선 */}
                {isTracking && (
                    <svg
                        style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '100%',
                            height: '100%',
                            zIndex: 999,
                            pointerEvents: 'none'
                        }}
                    >
                        <path
                            d={movementPath.length > 1 ? 
                                `M ${movementPath.map((pos, index) => 
                                    `${50 + (pos.x / 10)}% ${50 + (pos.y / 10)}%`
                                ).join(' L ')}` : ''}
                            stroke="red"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray="5,5"
                            opacity="0.7"
                        />
                    </svg>
                )}

                <style>
                    {`
                        @keyframes pulse {
                            0% {
                                transform: translate(-50%, -50%) scale(1);
                                opacity: 1;
                            }
                            50% {
                                transform: translate(-50%, -50%) scale(1.2);
                                opacity: 0.8;
                            }
                            100% {
                                transform: translate(-50%, -50%) scale(1);
                                opacity: 1;
                            }
                        }
                    `}
                </style>

                {/* <h6 style={{margin:0,textAlign:'left'}}>모바일 메인 화면</h6> */}
                {isTracking ? (
                    <>
                        <div
                            style={{
                                fontSize: '10px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                padding: '10px',
                                borderRadius: '5px',
                                margin: '10px'
                            }}
                        >
                            <div>실시간 위치 정보:</div>
                            <div>TIME: {new Date().toLocaleTimeString()}</div>
                            <div>LAT: {location.lat?.toFixed(6)}</div>
                            <div>LNG: {location.lng?.toFixed(6)}</div>
                            {/* <p>현재 위치: {currentIndex} / {dummyLocations.length}</p> */}
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