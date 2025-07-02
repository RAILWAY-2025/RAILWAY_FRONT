import React, { useState, useEffect, useRef } from 'react';
import Layout from '../Layouts/Admin/Layout';
import { getWorkerMovements, getAllWorkersInfo } from '../Api/workerApi';

const WebMain = ({ onLogout }) => {
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

    // 작업자 위치 데이터 상태
    const [workerPositions, setWorkerPositions] = useState([]);
    
    // 모달 상태
    const [showModal, setShowModal] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });

    // 작업자 이동 상태
    const [workerMovements, setWorkerMovements] = useState({});

    // 작업자 이동 데이터 가져오기
    useEffect(() => {
        const fetchWorkerMovements = async () => {
            try {
                const movementData = await getWorkerMovements();
                const workerData = await getAllWorkersInfo();
                
                if (movementData && workerData) {
                    // 각 작업자의 최신 위치를 추출
                    const positions = movementData.workerMovements.map(worker => {
                        const latestMovement = worker.movementData[worker.movementData.length - 1];
                        const workerInfo = workerData.workers.find(w => w.workerId === worker.workerId);
                        
                        return {
                            workerId: worker.workerId,
                            latitude: latestMovement.latitude,
                            longitude: latestMovement.longitude,
                            location: latestMovement.location,
                            activity: latestMovement.activity,
                            taskNumber: latestMovement.taskNumber,
                            connectionStatus: workerInfo?.connectionStatus || 'unknown',
                            workStatus: workerInfo?.workStatus || 'unknown'
                        };
                    });
                    
                    setWorkerPositions(positions);
                }
            } catch (error) {
                console.error('Error fetching worker data:', error);
            }
        };
        
        fetchWorkerMovements();
    }, []);

    // GPS 좌표를 화면 좌표로 변환하는 함수
    const gpsToScreen = (lat, lng) => {
        // 지도의 중심 GPS 좌표 (지도 이미지에 맞게 조정 필요)
        const centerLat = 35.125000;
        const centerLng = 128.791000;
        
        // 지도 이미지 크기 (픽셀)
        const mapWidth = 1920;
        const mapHeight = 1080;
        
        // GPS 좌표를 픽셀 좌표로 변환
        const latDiff = lat - centerLat;
        const lngDiff = lng - centerLng;
        
        // 1도당 픽셀 수 (실제 지도 스케일에 맞게 조정)
        const pixelsPerLat = mapHeight / 0.01; // 0.01도 = 전체 지도 높이
        const pixelsPerLng = mapWidth / 0.01;  // 0.01도 = 전체 지도 너비
        
        const x = (lngDiff * pixelsPerLng) * 0.1; // 스케일 조정
        const y = -(latDiff * pixelsPerLat) * 0.1; // Y축 반전 및 스케일 조정
        
        return { x, y };
    };

    // 작업자 GPS 추적 애니메이션
    useEffect(() => {
        const intervals = {};
        
        workerPositions.forEach((worker, index) => {
            const workerId = worker.workerId;
            
            // 연결 상태가 'disconnected'인 경우 움직이지 않음
            if (worker.connectionStatus === 'disconnected') {
                // 정지 상태로 초기 위치 설정
                const basePositions = [
                    { x: -200, y: -100 },  // W001 - 좌상단
                    { x: 200, y: -100 },   // W002 - 우상단
                    { x: 0, y: 150 },      // W003 - 하단 중앙
                    { x: -200, y: 100 },   // W004 - 좌하단
                    { x: 200, y: 100 },    // W005 - 우하단
                    { x: 0, y: -150 }      // W006 - 상단 중앙
                ];
                
                const basePos = basePositions[index] || { x: 0, y: 0 };
                
                setWorkerMovements(prev => ({
                    ...prev,
                    [workerId]: {
                        x: basePos.x,
                        y: basePos.y,
                        direction: 0
                    }
                }));
                return; // 연결이 끊어진 작업자는 움직이지 않음
            }
            
            // 연결된 작업자만 움직임
            const basePositions = [
                { x: -200, y: -100 },  // W001 - 좌상단
                { x: 200, y: -100 },   // W002 - 우상단
                { x: 0, y: 150 },      // W003 - 하단 중앙
                { x: -200, y: 100 },   // W004 - 좌하단
                { x: 200, y: 100 },    // W005 - 우하단
                { x: 0, y: -150 }      // W006 - 상단 중앙
            ];
            
            const basePos = basePositions[index] || { x: 0, y: 0 };
            
            // 각 작업자별 다른 초기 방향 설정
            const initialDirections = [45, 135, 225, 315, 90, 270]; // 각 작업자별 다른 시작 방향
            
            // 초기 위치 설정
            setWorkerMovements(prev => ({
                ...prev,
                [workerId]: {
                    x: basePos.x,
                    y: basePos.y,
                    direction: initialDirections[index] || 0
                }
            }));
            
            // 각 작업자별 다른 이동 패턴 설정 (작은 움직임)
            const movementPatterns = [
                // W001 - 작은 원형 이동
                [
                    { x: basePos.x, y: basePos.y },
                    { x: basePos.x + 15, y: basePos.y - 10 },
                    { x: basePos.x + 20, y: basePos.y + 5 },
                    { x: basePos.x + 10, y: basePos.y + 15 },
                    { x: basePos.x - 8, y: basePos.y + 12 },
                    { x: basePos.x - 12, y: basePos.y - 3 },
                    { x: basePos.x, y: basePos.y }
                ],
                // W002 - 작은 대각선 이동
                [
                    { x: basePos.x, y: basePos.y },
                    { x: basePos.x - 12, y: basePos.y + 8 },
                    { x: basePos.x - 18, y: basePos.y + 15 },
                    { x: basePos.x - 12, y: basePos.y + 20 },
                    { x: basePos.x, y: basePos.y + 15 },
                    { x: basePos.x + 8, y: basePos.y + 8 },
                    { x: basePos.x, y: basePos.y }
                ],
                // W003 - 작은 직선 왕복 이동
                [
                    { x: basePos.x, y: basePos.y },
                    { x: basePos.x + 20, y: basePos.y },
                    { x: basePos.x + 25, y: basePos.y },
                    { x: basePos.x + 20, y: basePos.y },
                    { x: basePos.x, y: basePos.y },
                    { x: basePos.x - 10, y: basePos.y },
                    { x: basePos.x, y: basePos.y }
                ],
                // W004 - 작은 지그재그 이동
                [
                    { x: basePos.x, y: basePos.y },
                    { x: basePos.x + 10, y: basePos.y - 8 },
                    { x: basePos.x + 18, y: basePos.y + 5 },
                    { x: basePos.x + 10, y: basePos.y + 15 },
                    { x: basePos.x, y: basePos.y + 10 },
                    { x: basePos.x - 8, y: basePos.y - 5 },
                    { x: basePos.x, y: basePos.y }
                ],
                // W005 - 작은 반시계방향 원형 이동
                [
                    { x: basePos.x, y: basePos.y },
                    { x: basePos.x - 12, y: basePos.y - 8 },
                    { x: basePos.x - 18, y: basePos.y + 5 },
                    { x: basePos.x - 10, y: basePos.y + 15 },
                    { x: basePos.x + 8, y: basePos.y + 12 },
                    { x: basePos.x + 12, y: basePos.y - 3 },
                    { x: basePos.x, y: basePos.y }
                ],
                // W006 - 작은 사각형 이동
                [
                    { x: basePos.x, y: basePos.y },
                    { x: basePos.x + 15, y: basePos.y },
                    { x: basePos.x + 15, y: basePos.y + 15 },
                    { x: basePos.x, y: basePos.y + 15 },
                    { x: basePos.x - 15, y: basePos.y + 15 },
                    { x: basePos.x - 15, y: basePos.y },
                    { x: basePos.x, y: basePos.y }
                ]
            ];
            
            const path = movementPatterns[index] || movementPatterns[0];
            let currentIndex = 0;
            
            // 각 작업자별 다른 주기 설정 (7초대 2개, 10초대 2개, 12초대 1개)
            const intervals = [7000, 7500, 10000, 10500, 12000, 8000];
            const interval = intervals[index] || 7000;
            
            intervals[workerId] = setInterval(() => {
                const nextIndex = (currentIndex + 1) % path.length;
                const currentPos = path[currentIndex];
                const nextPos = path[nextIndex];
                
                // 이동 방향 계산 (각도) - 현재 위치에서 다음 위치로의 방향
                const direction = Math.atan2(
                    nextPos.y - currentPos.y,
                    nextPos.x - currentPos.x
                ) * 180 / Math.PI + 90; // 90도 회전하여 화살표가 올바른 방향을 가리키도록
                
                setWorkerMovements(prev => ({
                    ...prev,
                    [workerId]: {
                        x: currentPos.x,
                        y: currentPos.y,
                        direction: direction
                    }
                }));
                
                currentIndex = nextIndex;
            }, interval);
        });
        
        return () => {
            Object.values(intervals).forEach(interval => clearInterval(interval));
        };
    }, [workerPositions]);



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
        <Layout onLogout={onLogout}>
            <div
                ref={mapRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    backgroundImage: `url(${process.env.PUBLIC_URL}/images/maps/jinyung-map.png)`,
                    backgroundSize: `auto ${100 * mapZoom}%`,
                    // backgroundPosition: `${mapOffset.x}px ${mapOffset.y}px`,
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    width: '100%',
                    height: '100vh',
                    position: 'relative',
                    overflow: 'hidden',
                    touchAction: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    
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



                {/* 작업자 위치 표시 */}
                {workerPositions.map((worker, index) => {
                    // 각 작업자별로 다른 위치에 배치 (간단한 방식)
                    const positions = [
                        { x: -150, y: -80 },  // W001
                        { x: 150, y: -80 },   // W002
                        { x: 0, y: 120 },     // W003
                        { x: -150, y: 80 },   // W004
                        { x: 150, y: 80 },    // W005
                        { x: 0, y: -120 }     // W006
                    ];
                    
                    const movement = workerMovements[worker.workerId];
                    const screenX = movement ? movement.x : (positions[index]?.x || 0);
                    const screenY = movement ? movement.y : (positions[index]?.y || 0);
                    const direction = movement ? movement.direction : 0;
                    
                    // 작업 상태에 따른 색상 결정
                    const getWorkerColor = (workStatus) => {
                        switch (workStatus) {
                            case '작업중':
                                return '#28a745'; // 초록색
                            case '작업일시중지':
                                return '#ff8c00'; // 주황색
                            case '완료':
                                return '#ffffff'; // 흰색
                            case 'SOS':
                                return '#dc3545'; // 빨간색
                            default:
                                return '#6c757d'; // 회색 (기본값)
                        }
                    };
                    
                    const workerColor = getWorkerColor(worker.workStatus);
                    const isConnected = worker.connectionStatus === 'connected';
                    
                    return (
                        <div
                            key={worker.workerId}
                            style={{
                                position: 'absolute',
                                top: `calc(50% + ${screenY + mapOffset.y}px)`,
                                left: `calc(50% + ${screenX + mapOffset.x}px)`,
                                width: '16px',
                                height: '16px',
                                backgroundColor: workerColor,
                                borderRadius: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 9999,
                                boxShadow: `0 0 8px ${workerColor === '#ffffff' ? 'rgba(0, 0, 0, 0.8)' : workerColor + '80'}, 0 0 16px ${workerColor === '#ffffff' ? 'rgba(0, 0, 0, 0.4)' : workerColor + '40'}`,
                                border: workerColor === '#ffffff' ? '2px solid #000000' : '2px solid rgba(255, 255, 255, 0.8)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            title={`${worker.workerId} - ${worker.location} (${worker.activity}) - ${worker.workStatus}`}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translate(-50%, -50%) scale(1.2)';
                                const labelDiv = e.target.querySelector('div');
                                if (labelDiv) {
                                    labelDiv.style.opacity = '1';
                                }
                                
                                // 모달 표시
                                setSelectedWorker(worker);
                                setModalPosition({
                                    x: e.clientX + 10,
                                    y: e.clientY - 10
                                });
                                setShowModal(true);
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translate(-50%, -50%) scale(1)';
                                const labelDiv = e.target.querySelector('div');
                                if (labelDiv) {
                                    labelDiv.style.opacity = '0';
                                }
                                
                                // 모달 숨김
                                setTimeout(() => {
                                    setShowModal(false);
                                    setSelectedWorker(null);
                                }, 100);
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: '-25px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                whiteSpace: 'nowrap',
                                opacity: 0,
                                transition: 'opacity 0.3s ease',
                                pointerEvents: 'none'
                            }}>
                                {worker.workerId}
                            </div>
                            
                            {/* 연결안됨 경고 표시 */}
                            {worker.connectionStatus === 'disconnected' && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-40px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    boxShadow: '0 0 8px rgba(220, 53, 69, 0.8)',
                                    animation: 'pulse-warning 1.5s infinite',
                                    zIndex: 9998
                                }}>
                                    !
                                </div>
                            )}
                            
                            {/* 이동 방향 삼각형 */}
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: '0',
                                height: '0',
                                borderLeft: '4px solid transparent',
                                borderRight: '4px solid transparent',
                                borderBottom: '8px solid rgba(255, 255, 255, 0.9)',
                                transform: `translate(-50%, -50%) rotate(${direction}deg) translateY(-12px)`,
                                zIndex: 9997,
                                transition: 'transform 0.3s ease',
                                filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.6))',
                                pointerEvents: 'none'
                            }} />
                        </div>
                    );
                }                )}

                {/* 작업자 정보 모달 */}
                {showModal && selectedWorker && (
                    <div
                        style={{
                            position: 'fixed',
                            top: modalPosition.y,
                            left: modalPosition.x,
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            color: 'white',
                            padding: '15px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            zIndex: 10000,
                            minWidth: '200px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            pointerEvents: 'none'
                        }}
                    >
                        <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                            {selectedWorker.workerId}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                            <strong>위치:</strong> {selectedWorker.location}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                            <strong>활동:</strong> {selectedWorker.activity}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                            <strong>작업 번호:</strong> {selectedWorker.taskNumber}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                            <strong>작업 상태:</strong> 
                            <span style={{ 
                                color: selectedWorker.workStatus === '작업중' ? '#28a745' : 
                                       selectedWorker.workStatus === '작업일시중지' ? '#ff8c00' :
                                       selectedWorker.workStatus === '완료' ? '#ffffff' :
                                       selectedWorker.workStatus === 'SOS' ? '#dc3545' : '#6c757d',
                                fontWeight: 'bold'
                            }}>
                                {selectedWorker.workStatus}
                            </span>
                        </div>
                        <div>
                            <strong>연결 상태:</strong> 
                            <span style={{ 
                                color: selectedWorker.connectionStatus === 'connected' ? '#28a745' : '#dc3545',
                                fontWeight: 'bold'
                            }}>
                                {selectedWorker.connectionStatus === 'connected' ? '연결됨' : '연결안됨'}
                            </span>
                        </div>
                    </div>
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
                        
                        @keyframes pulse-warning {
                            0% {
                                transform: translateX(-50%) scale(1);
                                opacity: 1;
                            }
                            50% {
                                transform: translateX(-50%) scale(1.3);
                                opacity: 0.7;
                            }
                            100% {
                                transform: translateX(-50%) scale(1);
                                opacity: 1;
                            }
                        }
                    `}
                </style>


            </div>


        </Layout>
    );
};

export default WebMain;