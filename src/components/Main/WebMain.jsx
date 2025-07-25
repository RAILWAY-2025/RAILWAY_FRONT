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

    // === [추적 기능 상태 추가] ===
    const [trackedWorkers, setTrackedWorkers] = useState(new Set()); // 추적 중인 작업자들
    const [showTrails, setShowTrails] = useState(false); // 경로 표시 여부
    const [predictedWorkers, setPredictedWorkers] = useState(new Set()); // 예측 경로 표시 중인 작업자들
    const [predictionTime, setPredictionTime] = useState(5); // 예측 시간 (분)

    // 추적 토글 함수
    const toggleTracking = (workerId) => {
        setTrackedWorkers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(workerId)) {
                newSet.delete(workerId);
            } else {
                newSet.add(workerId);
            }
            return newSet;
        });
        setShowTrails(true);
    };

    // 예측 경로 토글 함수
    const togglePrediction = (workerId) => {
        setPredictedWorkers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(workerId)) {
                newSet.delete(workerId);
            } else {
                newSet.add(workerId);
            }
            return newSet;
        });
    };

    // 예측 경로 생성 함수 - 현재 화살표 방향 기반 지그재그 경로
    const generatePredictedPath = (currentPos, timeMinutes, workerId, currentDirection) => {
        const predictions = [];
        
        // 작업자별 지그재그 패턴 (방향은 현재 화살표 방향 사용)
        const workerPatterns = {
            'W001': { zigzagIntensity: 20, zigzagFreq: 0.8 },      // 중간 지그재그
            'W002': { zigzagIntensity: 15, zigzagFreq: 1.2 },      // 약간 지그재그
            'W003': { zigzagIntensity: 25, zigzagFreq: 0.6 },      // 강한 지그재그
            'W004': { zigzagIntensity: 18, zigzagFreq: 1.0 },      // 중간 지그재그
            'W005': { zigzagIntensity: 12, zigzagFreq: 1.5 },      // 약간 지그재그
            'W006': { zigzagIntensity: 22, zigzagFreq: 0.7 }       // 강한 지그재그
        };
        
        const pattern = workerPatterns[workerId] || { zigzagIntensity: 15, zigzagFreq: 1.0 };
        const baseDistance = 150; // 기본 거리
        
        // 현재 화살표 방향을 라디안으로 변환
        const baseAngle = currentDirection * Math.PI / 180;
        
        // 항상 5분, 15분, 30분 후 위치 계산
        const timePoints = [5, 15, 30];
        
        timePoints.forEach((time, index) => {
            const distance = baseDistance * (time / 30); // 시간에 비례한 거리
            
            // 작업자별 다른 불규칙한 지그재그 효과
            const zigzagOffset = Math.sin(index * pattern.zigzagFreq + Math.random() * 0.5) * pattern.zigzagIntensity;
            
            const x = currentPos.x + Math.cos(baseAngle) * distance;
            const y = currentPos.y + Math.sin(baseAngle) * distance + zigzagOffset;
            
            predictions.push({ x, y, time });
        });
        
        return predictions;
    };

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

    // W002, W004용 적당한 지그재그 경로 생성 함수
    const generateSmoothPath = (start, end, steps = 120) => {
        const zigzagAmplitude = 12; // 더 적당한 지그재그 크기
        const irregularity = 0.35; // 더 부드럽고 적당한 불규칙성
        
        const path = [];
        let prevOffset = 0;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = start.x + (end.x - start.x) * t;
            const y = start.y + (end.y - start.y) * t;
            
            // 더 적당한 랜덤 offset 생성
            const randomSeed = i * 0.3;
            const randomOffset = (Math.sin(randomSeed * 60) * 0.6 + Math.sin(randomSeed * 30) * 0.4 + Math.sin(randomSeed * 15) * 0.2) * 2.5;
            
            // 이전 offset과의 연결 (더 부드럽게)
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

    // 디지털 신호(계단식) 경로 생성 함수 (x축→y축 순서)
    const generateDigitalPath = (start, end, steps = 10) => {
        const path = [];
        const half = Math.floor(steps / 2);
        for (let i = 0; i <= steps; i++) {
            let x, y;
            if (i <= half) {
                // x축만 이동
                x = start.x + ((end.x - start.x) * (i / half));
                y = start.y;
            } else {
                // y축만 이동
                x = end.x;
                y = start.y + ((end.y - start.y) * ((i - half) / (steps - half)));
            }
            path.push({ x, y });
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
        // 불규칙 지그재그 경로 생성 (원복)
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

    // W002 불규칙 이동 로직 (6번에서 8번까지) - W001과 유사한 방식
    useEffect(() => {
        const w002 = workerPositions.find(w => w.workerId === 'W002');
        if (!w002 || w002.connectionStatus === 'disconnected' || !linePath[6] || !linePath[8]) {
            return;
        }

        // W002 초기 위치 설정 (6번 위치)
        setWorkerMovements(prev => ({
            ...prev,
            W002: {
                x: linePath[6].x,
                y: linePath[6].y,
                direction: 0
            }
        }));

        // 6번에서 8번까지의 경로 생성 (앞으로 나가는 지그재그)
        const w002Path = generateSmoothPath(linePath[6], linePath[8], 180);
        let w002CurrentIndex = 0;

        // 12초마다 앞으로 이동 (setInterval 사용)
        const interval = setInterval(() => {
            let nextIndex = w002CurrentIndex + 1;
            
            // 8번에 도달하면 6번으로 리셋
            if (nextIndex >= w002Path.length - 1) {
                nextIndex = 0;
            }

            // 현재 위치와 다음 위치로 방향 계산
            const currentPos = w002Path[nextIndex];
            const previousPos = w002Path[w002CurrentIndex];
            let direction;
            
            // 이전 위치에서 현재 위치로의 실제 이동 방향 계산
            if (previousPos && currentPos) {
                const dx = currentPos.x - previousPos.x;
                const dy = currentPos.y - previousPos.y;
                direction = Math.atan2(dy, dx) * 180 / Math.PI;
                if (direction < 0) direction += 360;
            } else {
                // 첫 번째 이동인 경우 다음 지점 방향
                const nextPos = w002Path[nextIndex + 1];
                if (currentPos && nextPos) {
                    const dx = nextPos.x - currentPos.x;
                    const dy = nextPos.y - currentPos.y;
                    direction = Math.atan2(dy, dx) * 180 / Math.PI;
                    if (direction < 0) direction += 360;
                } else {
                    direction = 0;
                }
            }

            // W002 위치 업데이트
            setWorkerMovements(prev => ({
                ...prev,
                W002: {
                    x: currentPos.x,
                    y: currentPos.y,
                    direction: direction
                }
            }));

            // Trail 업데이트
            if (previousPos && currentPos) {
                setWorkerTrails(prev => ({
                    ...prev,
                    W002: [...(prev.W002 || []), { x: currentPos.x, y: currentPos.y }]
                }));
            }

            w002CurrentIndex = nextIndex;
        }, 12000);

        return () => {
            clearInterval(interval);
        };
    }, [workerPositions, linePath]);

    // W003 고정 위치 (연결 안됨 상태)
    useEffect(() => {
        if (!linePath || linePath.length < 4 || !linePath[3]) {
            return;
        }
        // W003을 3번 위치에 고정 (연결 안됨 상태)
        setWorkerMovements(prev => ({
            ...prev,
            W003: {
                x: linePath[3].x,
                y: linePath[3].y,
                direction: 0
            }
        }));
        // W003 디지털 신호 경로(3→2) 생성 (trail용)
        if (!linePath[2]) return;
        const w003Path = generateDigitalPath(linePath[3], linePath[2], 20);
        // W003의 trail을 trail state에 저장 (고정이지만 trail 시각화용)
        setWorkerTrails(prev => ({
            ...prev,
            W003: w003Path
        }));
    }, [linePath]);

    // W004 이동 로직 (8번에서 12번까지)
    useEffect(() => {
        // linePath가 로드되지 않았으면 대기
        if (!linePath || linePath.length < 13) {
            return;
        }
        // W004가 workerPositions에 없어도 강제로 생성
        const w004 = workerPositions.find(w => w.workerId === 'W004');
        if (w004 && w004.connectionStatus === 'disconnected') {
            return;
        }
        // W004 초기 위치 설정 (8번 위치, direction=270)
        if (linePath[8]) {
            setWorkerMovements(prev => ({
                ...prev,
                W004: {
                    x: linePath[8].x,
                    y: linePath[8].y,
                    direction: 270 // 위쪽
                }
            }));
        }
        // 8번에서 12번까지의 경로 생성 (불규칙한 지그재그)
        if (!linePath[8] || !linePath[12]) {
            return;
        }
        const w004Path = generateSmoothPath(linePath[8], linePath[12], 190);
        let w004CurrentIndex = 0;
        // 15초마다 천천히 이동
        const interval = setInterval(() => {
            let nextIndex = w004CurrentIndex + 1;
            // 12번에 도달하면 8번으로 리셋
            if (nextIndex >= w004Path.length - 1) {
                nextIndex = 0;
            }
            // 현재 위치와 다음 위치로 방향 계산
            const currentPos = w004Path[nextIndex];
            const previousPos = w004Path[w004CurrentIndex];
            let direction;
            // 이전 위치에서 현재 위치로의 실제 이동 방향 계산
            if (previousPos && currentPos) {
                const dx = currentPos.x - previousPos.x;
                const dy = currentPos.y - previousPos.y;
                direction = Math.atan2(dy, dx) * 180 / Math.PI;
                if (direction < 0) direction += 360;
            } else {
                // 첫 번째 이동인 경우 다음 지점 방향
                const nextPos = w004Path[nextIndex + 1];
                if (currentPos && nextPos) {
                    const dx = nextPos.x - currentPos.x;
                    const dy = nextPos.y - currentPos.y;
                    direction = Math.atan2(dy, dx) * 180 / Math.PI;
                    if (direction < 0) direction += 360;
                } else {
                    direction = 0;
                }
            }
            // W004 위치 업데이트
            setWorkerMovements(prev => ({
                ...prev,
                W004: {
                    x: currentPos.x,
                    y: currentPos.y,
                    direction: direction
                }
            }));
            // Trail 업데이트
            if (previousPos && currentPos) {
                setWorkerTrails(prev => ({
                    ...prev,
                    W004: [...(prev.W004 || []), { x: currentPos.x, y: currentPos.y }]
                }));
            }
            w004CurrentIndex = nextIndex;
        }, 15000);
        return () => {
            clearInterval(interval);
        };
    }, [workerPositions, linePath]);

    // 나머지 작업자 이동 로직 (W001, W002, W003, W004 제외)
    useEffect(() => {
        const intervals = {};
        
        workerPositions.forEach((worker, index) => {
            const workerId = worker.workerId;
            
            if (workerId === 'W001' || workerId === 'W002' || workerId === 'W003' || workerId === 'W004' || worker.connectionStatus === 'disconnected') {
                return;
            }
            
            const basePositions = [
                { x: 200, y: 100 },    // W005 - 우하단
                { x: 0, y: -150 }      // W006 - 상단 중앙
            ];
            
            const basePos = basePositions[index - 4] || { x: 0, y: 0 };
            const initialDirections = [90, 270];
            
            setWorkerMovements(prev => ({
                ...prev,
                [workerId]: {
                    x: basePos.x,
                    y: basePos.y,
                    direction: initialDirections[index - 2] || 0
                }
            }));
            
            const movementPatterns = [
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
            
            const path = movementPatterns[index - 4] || movementPatterns[0];
            let currentIndex = 0;
            
            const intervals = [12000, 8000];
            const interval = intervals[index - 4] || 7000;
            
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

    // 나머지 작업자 trail 업데이트 (W001, W002, W003, W004 제외)
    useEffect(() => {
        const intervals = {};
        workerPositions.forEach((worker, index) => {
            const workerId = worker.workerId;
            if (workerId === 'W001' || workerId === 'W002' || workerId === 'W003' || workerId === 'W004' || worker.connectionStatus === 'disconnected') return;
            
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


    // === [상단 우측 작업자 상태 테이블 컴포넌트 추가] ===
    const WorkerStatusTable = ({ workers }) => (
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          zIndex: 20000,
          minWidth: 420,
          fontSize: 12,
          padding: '10px 14px',
          maxHeight: 320,
          overflowY: 'auto',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color: '#333', textAlign: 'center' }}>
          작업자 상태
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f7fa' }}>
              <th style={{ padding: '2px 4px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>ID</th>
              <th style={{ padding: '2px 4px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>상태</th>
              <th style={{ padding: '2px 4px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>연결</th>
              <th style={{ padding: '2px 4px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>위치</th>
              <th style={{ padding: '2px 4px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>활동</th>
              <th style={{ padding: '2px 4px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>추적하기</th>
              <th style={{ padding: '2px 4px', borderBottom: '1px solid #e0e0e0', fontWeight: 600 }}>예측경로</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.workerId} style={{ background: w.connectionStatus === 'connected' ? '#fff' : '#fbeaea' }}>
                <td style={{ padding: '2px 4px', textAlign: 'center', fontWeight: 500 }}>{w.workerId}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', color: w.workStatus === '작업중' ? '#28a745' : w.workStatus === '작업일시중지' ? '#ff8c00' : w.workStatus === '완료' ? '#007bff' : w.workStatus === 'SOS' ? '#dc3545' : '#6c757d', fontWeight: 600 }}>{w.workStatus}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center', color: w.connectionStatus === 'connected' ? '#28a745' : '#dc3545', fontWeight: 600 }}>{w.connectionStatus === 'connected' ? '연결' : '끊김'}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>{w.location}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>{w.activity}</td>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                  <button
                    onClick={() => toggleTracking(w.workerId)}
                    style={{
                      padding: '2px 6px',
                      fontSize: 10,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      backgroundColor: trackedWorkers.has(w.workerId) ? '#dc3545' : '#28a745',
                      color: 'white',
                      fontWeight: 'bold',
                      minWidth: 50
                    }}
                  >
                    {trackedWorkers.has(w.workerId) ? '중지' : '추적'}
                  </button>
                </td>
                <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                  <button
                    onClick={() => togglePrediction(w.workerId)}
                    style={{
                      padding: '2px 6px',
                      fontSize: 10,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      backgroundColor: predictedWorkers.has(w.workerId) ? '#dc3545' : '#17a2b8',
                      color: 'white',
                      fontWeight: 'bold',
                      minWidth: 50
                    }}
                  >
                    {predictedWorkers.has(w.workerId) ? '중지' : '예측'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

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
                                width: '20px',
                                height: '20px',
                                backgroundColor: workerColor,
                                borderRadius: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 9999,
                                boxShadow: `0 0 12px ${workerColor === '#ffffff' ? 'rgba(0, 0, 0, 0.9)' : workerColor + '90'}, 0 0 24px ${workerColor === '#ffffff' ? 'rgba(0, 0, 0, 0.6)' : workerColor + '50'}, 0 0 36px ${workerColor === '#ffffff' ? 'rgba(0, 0, 0, 0.3)' : workerColor + '30'}`,
                                border: workerColor === '#ffffff' ? '3px solid #000000' : '3px solid rgba(255, 255, 255, 0.9)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                animation: 'worker-pulse 2s infinite'
                            }}
                            title={`${worker.workerId} - ${worker.location} (${worker.activity}) - ${worker.workStatus}`}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translate(-50%, -50%) scale(1.3)';
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
                                top: '-30px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                color: 'white',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                opacity: 0,
                                transition: 'opacity 0.3s ease',
                                pointerEvents: 'none',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                {worker.workerId}
                            </div>
                            
                            {/* 연결안됨 경고 표시 */}
                            {worker.connectionStatus === 'disconnected' && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-45px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    boxShadow: '0 0 12px rgba(220, 53, 69, 0.9), 0 0 24px rgba(220, 53, 69, 0.5)',
                                    animation: 'pulse-warning 1.5s infinite',
                                    zIndex: 9998,
                                    border: '2px solid rgba(255, 255, 255, 0.8)'
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
                                borderTop: '4px solid transparent',
                                borderBottom: '4px solid transparent',
                                borderLeft: '8px solid rgba(255, 255, 255, 0.95)',
                                transform: `translate(-50%, -50%) rotate(${movement.direction}deg) translateX(15px)`,
                                zIndex: 9997,
                                transition: 'transform 0.3s ease',
                                filter: 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.8))',
                                pointerEvents: 'none'
                            }} />
                        </div>
                    );
                })}

                {/* linePath 경로 점 시각화 (파란색 원 + 인덱스) */}
                {linePath && linePath.map((pt, idx) => (
                  // 0~12번은 잠시 숨김 (주석처리, 필요시 아래 주석 해제)
                  (idx >= 0 && idx <= 12) ? null : (
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
                  )
                ))}

                {/* 작업자 이동 경로 (trail) - 추적 중인 작업자만 표시 */}
                {showTrails && Object.entries(workerTrails).map(([workerId, trail]) => {
                    if (!trackedWorkers.has(workerId) || trail.length < 2) return null;
                    
                    return (
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
                                strokeWidth={2 * scaleX}
                                strokeDasharray="8 6"
                                opacity="0.7"
                            />
                        </svg>
                    );
                })}

                {/* 예측 경로 표시 - 직선 경로와 5분, 15분, 30분 후 O 표시 */}
                {predictedWorkers.size > 0 && workerPositions.map((worker) => {
                    if (!predictedWorkers.has(worker.workerId)) return null;
                    
                    const movement = workerMovements[worker.workerId];
                    if (!movement) return null;
                    
                    const predictedPoints = generatePredictedPath({ x: movement.x, y: movement.y }, predictionTime, worker.workerId, movement.direction);
                    const workerColor = getWorkerColor(worker.workerId);
                    
                    return (
                        <div key={`prediction-${worker.workerId}`}>
                            {/* 예측 경로 연결선들 */}
                            {predictedPoints.length > 0 && (
                                <svg
                                    width={containerSize.width}
                                    height={containerSize.height}
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        pointerEvents: 'none',
                                        zIndex: 14000
                                    }}
                                >
                                    {/* 현재 위치에서 첫 번째 점까지 */}
                                    <line
                                        x1={(movement.x + 25) * scaleX}
                                        y1={movement.y * scaleY}
                                        x2={predictedPoints[0].x * scaleX}
                                        y2={predictedPoints[0].y * scaleY}
                                        stroke={workerColor}
                                        strokeWidth={2 * scaleX}
                                        strokeDasharray="8 4"
                                        opacity="0.4"
                                    />
                                    
                                    {/* 점들 사이 연결선 */}
                                    {predictedPoints.map((pt, idx) => {
                                        if (idx === 0) return null; // 첫 번째 점은 위에서 처리
                                        return (
                                            <line
                                                key={`line-${worker.workerId}-${idx}`}
                                                x1={predictedPoints[idx - 1].x * scaleX}
                                                y1={predictedPoints[idx - 1].y * scaleY}
                                                x2={pt.x * scaleX}
                                                y2={pt.y * scaleY}
                                                stroke={workerColor}
                                                strokeWidth={2 * scaleX}
                                                strokeDasharray="8 4"
                                                opacity="0.4"
                                            />
                                        );
                                    })}
                                </svg>
                            )}
                            
                            {/* 예측 경로 점들 (5분, 15분, 30분 후) */}
                            {predictedPoints.map((pt, idx) => (
                                <div
                                    key={`prediction-dot-${worker.workerId}-${pt.time}`}
                                    style={{
                                        position: 'absolute',
                                        left: pt.x * scaleX,
                                        top: pt.y * scaleY,
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: workerColor,
                                        border: '2px solid rgba(255, 255, 255, 0.8)',
                                        borderRadius: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: 14001,
                                        boxShadow: `0 0 8px ${workerColor}80`,
                                        opacity: 0.6,
                                        animation: 'prediction-pulse 2s infinite'
                                    }}
                                    title={`${worker.workerId} - ${pt.time}분 후 예상 위치`}
                                />
                            ))}
                        </div>
                    );
                })}

                {/* W001의 dash trail(가늘게, 초록색) */}
                {/* 아래는 중복이므로 주석처리 (위에서 dash로 통일) */}
                {false && w001Trail.map((seg, idx) =>
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
        strokeDasharray="8 6"
        opacity="0.7"
      />
    </svg>
  ) : null
)}

                {/* linePath.json 불러오기 (이미 import됨) */}
                {/* linePath.json 불러오기 - 주석 처리됨 */}
                {/* {linePath.length > 10 && (
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
                    <polyline
                      points={linePath.slice(0, 5).map(pt => `${pt.x * scaleX},${pt.y * scaleY}`).join(' ')}
                      fill="none"
                      stroke="#ff2222"
                      strokeWidth={14 * scaleX}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                    <polyline
                      points={linePath.slice(5, 10).map(pt => `${pt.x * scaleX},${pt.y * scaleY}`).join(' ')}
                      fill="none"
                      stroke="#ff2222"
                      strokeWidth={14 * scaleX}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
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
                )} */}


                {/* W001의 dash trail - 추적 중일 때만 표시 */}
                {showTrails && trackedWorkers.has('W001') && w001Trail.map((seg, idx) =>
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
                                strokeDasharray="8 6"
                                opacity="0.7"
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

                {/* 우측상단 상태 테이블 */}
                <WorkerStatusTable workers={workerPositions} />

                <style>
                    {`
                        @keyframes worker-pulse {
                            0% {
                                box-shadow: 0 0 12px rgba(40, 167, 69, 0.9), 0 0 24px rgba(40, 167, 69, 0.5), 0 0 36px rgba(40, 167, 69, 0.3);
                            }
                            50% {
                                box-shadow: 0 0 20px rgba(40, 167, 69, 1), 0 0 40px rgba(40, 167, 69, 0.7), 0 0 60px rgba(40, 167, 69, 0.5);
                            }
                            100% {
                                box-shadow: 0 0 12px rgba(40, 167, 69, 0.9), 0 0 24px rgba(40, 167, 69, 0.5), 0 0 36px rgba(40, 167, 69, 0.3);
                            }
                        }
                        
                        @keyframes prediction-pulse {
                            0% {
                                transform: translate(-50%, -50%) scale(1);
                                opacity: 1;
                            }
                            50% {
                                transform: translate(-50%, -50%) scale(1.3);
                                opacity: 0.7;
                            }
                            100% {
                                transform: translate(-50%, -50%) scale(1);
                                opacity: 1;
                            }
                        }
                        
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