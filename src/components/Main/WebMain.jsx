import React, { useState, useEffect, useRef } from 'react';
import Layout from '../Layouts/Admin/Layout';
import { getWorkerMovements, getAllWorkersInfo } from '../Api/workerApi';
// import linePathData from '../../../public/dataset/linePath.json'; // 제거

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
    const [containerSize, setContainerSize] = useState({ width: 1920, height: 1080 });

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
    // trail 상태 관리
    const [workerTrails, setWorkerTrails] = useState({ W001: [] }); // { W001: [ {from, to}, ... ] }
    // (중복 선언 제거) w001Pos는 아래에서만 선언

    // W001 불규칙 지그재그 경로 생성 함수
    const generateIrregularZigzagPath = (start, end, steps = 40) => {
        const zigzagAmplitude = 15; // 지그재그 크기
        const irregularity = 0.7; // 불규칙성 정도
        
        const path = [];
        let prevOffset = 0;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = start.x + (end.x - start.x) * t;
            const y = start.y + (end.y - start.y) * t;
            
            // 부드러운 랜덤 offset 생성
            const randomSeed = i * 0.3;
            const randomOffset = (Math.sin(randomSeed * 100) * 0.5 + Math.sin(randomSeed * 50) * 0.3) * 2;
            
            // 이전 offset과의 부드러운 연결
            const targetOffset = randomOffset * zigzagAmplitude;
            const currentOffset = prevOffset + (targetOffset - prevOffset) * irregularity;
            
            // 직선 방향에 수직인 벡터 계산
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            if (len > 0) {
                const nx = -dy / len; // 수직 벡터 (x)
                const ny = dx / len;  // 수직 벡터 (y)
                
                path.push({
                    x: x + nx * currentOffset,
                    y: y + ny * currentOffset,
                });
            } else {
                path.push({ x, y });
            }
            
            prevOffset = currentOffset;
        }
        
        return path;
    };

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

    // linePath.json fetch로 불러오기
    const [linePath, setLinePath] = useState([]);

    useEffect(() => {
        fetch(process.env.PUBLIC_URL + '/dataset/linePath.json')
            .then(res => res.json())
            .then(data => setLinePath(data.linePath || []));
    }, []);

    useEffect(() => {
      const handleResize = () => {
        if (mapRef.current) {
          setContainerSize({
            width: mapRef.current.offsetWidth,
            height: mapRef.current.offsetHeight
          });
        }
      };
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const scaleX = containerSize.width / 1920;
    const scaleY = containerSize.height / 1080;

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

    // W001 불규칙 지그재그 이동 로직
    const [w001Path, setW001Path] = useState([]);
    const [w001CurrentIndex, setW001CurrentIndex] = useState(0);
    const [w001Forward, setW001Forward] = useState(true);
    const [w001Trail, setW001Trail] = useState([]);

    useEffect(() => {
        if (!linePath[10] || !linePath[11]) return;
        
        // 불규칙 지그재그 경로 생성
        const zigzagPath = generateIrregularZigzagPath(linePath[10], linePath[11], 40);
        setW001Path(zigzagPath);
        setW001CurrentIndex(0);
        setW001Forward(true);
        setW001Trail([]);
        
        // W001 초기 위치 설정
        if (zigzagPath.length > 0) {
            setWorkerMovements(prev => ({
                ...prev,
                W001: {
                    x: zigzagPath[0].x,
                    y: zigzagPath[0].y,
                    direction: 0
                }
            }));
        }
    }, [linePath]);

    // W001 이동 애니메이션 (10초마다 한 스텝)
    useEffect(() => {
        if (w001Path.length === 0) return;

        const interval = setInterval(() => {
            setW001CurrentIndex(prevIndex => {
                let nextIndex;
                let newForward = w001Forward;

                if (w001Forward) {
                    nextIndex = prevIndex + 1;
                    if (nextIndex >= w001Path.length - 1) {
                        newForward = false;
                        nextIndex = w001Path.length - 2;
                    }
                } else {
                    nextIndex = prevIndex - 1;
                    if (nextIndex <= 0) {
                        newForward = true;
                        nextIndex = 1;
                    }
                }

                setW001Forward(newForward);

                // 현재 위치와 다음 위치로 방향 계산
                const currentPos = w001Path[nextIndex];
                let direction;
                
                // 경로의 끝에 도달했는지 확인
                if ((newForward && nextIndex >= w001Path.length - 1) || (!newForward && nextIndex <= 0)) {
                    // 경로의 끝에서는 이전 방향을 유지
                    const prevPos = w001Path[prevIndex];
                    if (prevPos && currentPos) {
                        const dx = currentPos.x - prevPos.x;
                        const dy = currentPos.y - prevPos.y;
                        direction = Math.atan2(dy, dx) * 180 / Math.PI;
                        // CSS 회전 각도로 변환 (0도 = 오른쪽)
                        if (direction < 0) direction += 360;
                    } else {
                        direction = newForward ? 0 : 180; // 기본 방향
                    }
                } else {
                    // 다음 위치로의 방향 계산
                    const nextNextIndex = newForward ? nextIndex + 1 : nextIndex - 1;
                    const nextPos = w001Path[nextNextIndex];
                    
                    if (currentPos && nextPos) {
                        const dx = nextPos.x - currentPos.x;
                        const dy = nextPos.y - currentPos.y;
                        direction = Math.atan2(dy, dx) * 180 / Math.PI;
                        // CSS 회전 각도로 변환 (0도 = 오른쪽)
                        if (direction < 0) direction += 360;
                    } else {
                        direction = newForward ? 0 : 180; // 기본 방향
                    }
                }

                // W001 위치 업데이트 (현재 위치로)
                setWorkerMovements(prev => ({
                    ...prev,
                    W001: {
                        x: currentPos.x,
                        y: currentPos.y,
                        direction: direction
                    }
                }));

                // Trail 업데이트 (이전 위치에서 현재 위치로)
                const prevPos = w001Path[prevIndex];
                if (prevPos && currentPos) {
                    setW001Trail(prev => [...prev, { from: prevPos, to: currentPos, direction }]);
                }

                return nextIndex;
            });
        }, 10000); // 10초마다 한 스텝

        return () => clearInterval(interval);
    }, [w001Path, w001Forward]);

    // 나머지 작업자 이동 로직
    useEffect(() => {
        const intervals = {};
        
        workerPositions.forEach((worker, index) => {
            const workerId = worker.workerId;
            
            if (workerId === 'W001' || worker.connectionStatus === 'disconnected') {
                return;
            }
            
            const basePositions = [
                { x: 200, y: -100 },   // W002 - 우상단
                { x: 0, y: 150 },      // W003 - 하단 중앙
                { x: -200, y: 100 },   // W004 - 좌하단
                { x: 200, y: 100 },    // W005 - 우하단
                { x: 0, y: -150 }      // W006 - 상단 중앙
            ];
            
            const basePos = basePositions[index - 1] || { x: 0, y: 0 };
            const initialDirections = [135, 225, 315, 90, 270];
            
            setWorkerMovements(prev => ({
                ...prev,
                [workerId]: {
                    x: basePos.x,
                    y: basePos.y,
                    direction: initialDirections[index - 1] || 0
                }
            }));
            
            const movementPatterns = [
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
            
            const path = movementPatterns[index - 1] || movementPatterns[0];
            let currentIndex = 0;
            
            const intervals = [7500, 10000, 10500, 12000, 8000];
            const interval = intervals[index - 1] || 7000;
            
            intervals[workerId] = setInterval(() => {
                const nextIndex = (currentIndex + 1) % path.length;
                const currentPos = path[nextIndex];
                const nextNextIndex = (nextIndex + 1) % path.length;
                const nextPos = path[nextNextIndex];
                
                // 현재 위치에서 다음 위치로의 방향 계산 (미래 방향)
                const dx = nextPos.x - currentPos.x;
                const dy = nextPos.y - currentPos.y;
                let direction = Math.atan2(dy, dx) * 180 / Math.PI;
                // CSS 회전 각도로 변환 (0도 = 오른쪽)
                if (direction < 0) direction += 360;
                
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

    // 나머지 작업자 trail 업데이트
    useEffect(() => {
        const intervals = {};
        workerPositions.forEach((worker, index) => {
            const workerId = worker.workerId;
            if (workerId === 'W001' || worker.connectionStatus === 'disconnected') return;
            
            intervals[workerId] = setInterval(() => {
                setWorkerMovements(prev => {
                    const movement = prev[workerId];
                    if (!movement) return prev;
                    
                    setWorkerTrails(trails => ({
                        ...trails,
                        [workerId]: [...(trails[workerId] || []), { x: movement.x, y: movement.y }]
                    }));
                    return prev;
                });
            }, 1000 + index * 500);
        });
        return () => Object.values(intervals).forEach(clearInterval);
    }, [workerPositions, workerMovements, workerTrails]);

    // 작업자별 색상 반환 함수
    const getWorkerColor = (workerId) => {
        if (workerId === 'W001') return '#28a745';
        if (workerId === 'W002') return '#6c757d';
        if (workerId === 'W003') return '#ffffff';
        if (workerId === 'W004') return '#ff8c00';
        if (workerId === 'W005') return '#dc3545';
        if (workerId === 'W006') return '#007bff';
        return '#6c757d';
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
        <Layout onLogout={onLogout}>
            <div
                ref={mapRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    backgroundImage: `url(${process.env.PUBLIC_URL}/images/maps/jinyung-map.png)`,
                    backgroundSize: '100% 100%',
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
                    const workerId = worker.workerId;
                    const movement = workerMovements[workerId];
                    
                    if (!movement) return null;
                    
                    const getWorkerColor = (workStatus) => {
                        switch (workStatus) {
                            case '작업중':
                                return '#28a745';
                            case '작업일시중지':
                                return '#ff8c00';
                            case '완료':
                                return '#ffffff';
                            case 'SOS':
                                return '#dc3545';
                            default:
                                return '#6c757d';
                        }
                    };
                    
                    const workerColor = getWorkerColor(worker.workStatus);
                    const isConnected = worker.connectionStatus === 'connected';
                    
                    return (
                        <div
                            key={worker.workerId}
                            style={{
                                position: 'absolute',
                                left: movement.x * scaleX,
                                top: movement.y * scaleY,
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
                                borderTop: '3px solid transparent',
                                borderBottom: '3px solid transparent',
                                borderLeft: '6px solid rgba(255, 255, 255, 0.9)',
                                transform: `translate(-50%, -50%) rotate(${movement.direction}deg) translateX(12px)`,
                                zIndex: 9997,
                                transition: 'transform 0.3s ease',
                                filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.6))',
                                pointerEvents: 'none'
                            }} />
                        </div>
                    );
                })}

                {/* linePath 경로 점 시각화 (파란색 원 + 인덱스) */}
                {linePath && linePath.map((pt, idx) => (
                  <div
                    key={`linepath-dot-${idx}`}
                    style={{
                      position: 'absolute',
                      left: pt.x * scaleX + mapOffset.x,
                      top: pt.y * scaleY + mapOffset.y,
                      width: '28px',
                      height: '28px',
                      background: 'rgba(0, 200, 255, 0.9)',
                      border: '4px solid #fff',
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 20000,
                      boxShadow: '0 0 16px 8px #00e0ff, 0 0 0 4px #000',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      color: '#fff',
                      textShadow: '0 0 4px #000, 0 0 8px #00e0ff',
                    }}
                    title={`linePath[${idx}] (${pt.x}, ${pt.y})`}
                  >
                    {idx}
                  </div>
                ))}

                {/* 작업자 dash 이동 경로 표시 (SVG polyline, 작업자별 색상) */}
                {Object.entries(workerTrails).map(([workerId, trail]) => (
                  <svg
                    key={workerId}
                    width={containerSize.width}
                    height={containerSize.height}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      pointerEvents: 'none',
                      zIndex: 15000
                    }}
                  >
                    <polyline
                      points={trail.map(pt => `${pt.x * scaleX},${pt.y * scaleY}`).join(' ')}
                      fill="none"
                      stroke={getWorkerColor(workerId)}
                      strokeWidth={4 * scaleX}
                      strokeDasharray="8 6"
                      opacity="0.6"
                    />
                  </svg>
                ))}

                {/* W001의 dash trail(가늘게, 초록색) */}
                {w001Trail.map((seg, idx) =>
  seg && seg.from && seg.to ? (
    <svg
      key={idx}
      width={containerSize.width}
      height={containerSize.height}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 15000
      }}
    >
      <polyline
        points={`${seg.from.x * scaleX},${seg.from.y * scaleY} ${seg.to.x * scaleX},${seg.to.y * scaleY}`}
        fill="none"
        stroke="#28a745"
        strokeWidth={2 * scaleX}
        strokeDasharray="6 4"
        opacity="0.8"
      />
    </svg>
  ) : null
)}

                {/* linePath.json 불러오기 (이미 import됨) */}
                {linePath.length > 10 && (
                  <svg
                    width={containerSize.width}
                    height={containerSize.height}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      pointerEvents: 'none',
                      zIndex: 12000
                    }}
                  >
                    {/* 0~4번까지 연결 */}
                    <polyline
                      points={linePath.slice(0, 5).map(pt => `${pt.x * scaleX},${pt.y * scaleY}`).join(' ')}
                      fill="none"
                      stroke="#ff2222"
                      strokeWidth={14 * scaleX}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                    {/* 5~9번까지 연결 */}
                    <polyline
                      points={linePath.slice(5, 10).map(pt => `${pt.x * scaleX},${pt.y * scaleY}`).join(' ')}
                      fill="none"
                      stroke="#ff2222"
                      strokeWidth={14 * scaleX}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                    {/* 10~끝까지 연결 */}
                    <polyline
                      points={linePath.slice(10).map(pt => `${pt.x * scaleX},${pt.y * scaleY}`).join(' ')}
                      fill="none"
                      stroke="#ff2222"
                      strokeWidth={14 * scaleX}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                  </svg>
                )}


                {w001Trail.map((seg, idx) =>
  seg && seg.from && seg.to ? (
    <svg
      key={idx}
      width={containerSize.width}
      height={containerSize.height}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 15000
      }}
    >
      <polyline
        points={`${seg.from.x * scaleX},${seg.from.y * scaleY} ${seg.to.x * scaleX},${seg.to.y * scaleY}`}
        fill="none"
        stroke="#28a745"
        strokeWidth={3 * scaleX}
        strokeDasharray="10 8"
        opacity="0.9"
      />
    </svg>
  ) : null
)}

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