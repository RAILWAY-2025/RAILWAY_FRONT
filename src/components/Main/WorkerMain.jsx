import React, { useState, useEffect } from 'react';
import Layout from '../Layouts/Woker/Layout';

const WorkerMain = ({ onLogout }) => {
    const [currentTask, setCurrentTask] = useState('');
    const [workStatus, setWorkStatus] = useState('대기중'); // '대기중', '작업중', '작업일시중지', '완료'
    const [completedTasks, setCompletedTasks] = useState([]); // 완료된 작업 목록
    const [taskList, setTaskList] = useState([]); // 동적 작업 목록
    const [editingTask, setEditingTask] = useState(null); // 수정 중인 작업 ID
    const [activeTaskId, setActiveTaskId] = useState(null); // 현재 활성화된 작업 ID
    const [isComposing, setIsComposing] = useState(false); // IME 조합 상태
    const [workStartTime, setWorkStartTime] = useState(null); // 작업 시작 시간
    const [workEndTime, setWorkEndTime] = useState(null); // 작업 종료 시간
    const [showCompletionScreen, setShowCompletionScreen] = useState(false); // 작업 완료 화면 표시 여부

    const handleWorkToggle = () => {
        if (workStatus === '대기중') {
            setWorkStatus('작업중');
        } else if (workStatus === '작업중') {
            setWorkStatus('작업일시중지');
        } else if (workStatus === '작업일시중지') {
            setWorkStatus('작업중');
        }
    };

    const handleCompleteWork = () => {
        // 모든 작업이 체크되지 않은 경우 경고 메시지 표시
        if (completedTasks.length < taskList.length) {
            const confirmEnd = window.confirm('아직 미달성된 작업목록이있습니다. 종료하시겠습니까?');
            if (!confirmEnd) {
                return; // 취소 시 함수 종료
            }
        }
        
        setWorkEndTime(new Date());
        setShowCompletionScreen(true);
        setWorkStatus('완료');
    };

    const handleBackToWork = () => {
        // 현재 날짜와 작업 시작 날짜 비교
        const today = new Date().toDateString();
        const startDate = workStartTime ? workStartTime.toDateString() : null;
        
        if (startDate === today) {
            const confirmContinue = window.confirm('다시 작업하시겠습니까?');
            if (!confirmContinue) {
                return; // 취소 시 함수 종료
            }
            setShowCompletionScreen(false);
            setWorkStatus('작업중');
        } else {
            alert('지난 작업을 수정 할 수 없습니다');
        }
    };

    // 로컬 스토리지에서 작업 목록 불러오기
    useEffect(() => {
        const savedTasks = localStorage.getItem('workerTasks');
        if (savedTasks) {
            const parsedTasks = JSON.parse(savedTasks);
            setTaskList(parsedTasks);
            // 첫 번째 작업을 현재 작업으로 설정
            if (parsedTasks.length > 0) {
                setCurrentTask(parsedTasks[0].content);
            }
        }
    }, []);

    // 작업 목록이 변경될 때마다 로컬 스토리지에 저장
    useEffect(() => {
        localStorage.setItem('workerTasks', JSON.stringify(taskList));
    }, [taskList]);

    const handleTaskComplete = (taskId) => {
        let newCompletedTasks;
        if (completedTasks.includes(taskId)) {
            newCompletedTasks = completedTasks.filter(id => id !== taskId);
        } else {
            newCompletedTasks = [...completedTasks, taskId];
        }
        
        setCompletedTasks(newCompletedTasks);
        
        // 모든 작업이 체크되지 않았으면 완료 상태 해제
        if (newCompletedTasks.length < taskList.length && workStatus === '완료') {
            setWorkStatus('작업중');
        }
        
        // 현재 활성화된 작업이 체크되면 작업완료 상태로 변경
        if (activeTaskId === taskId && newCompletedTasks.includes(taskId)) {
            setWorkStatus('작업완료');
        }
        // 현재 활성화된 작업의 체크가 해제되면 다시 작업중 상태로 변경
        else if (activeTaskId === taskId && !newCompletedTasks.includes(taskId)) {
            setWorkStatus('작업중');
        }
    };

    const handleAddTask = () => {
        const newTaskNumber = taskList.length + 1;
        const newTask = {
            id: Date.now(),
            number: newTaskNumber,
            content: `작업 ${newTaskNumber}`,
            completed: false
        };
        setTaskList(prev => [...prev, newTask]);
        
        // 첫 번째 작업이면 현재 작업으로 설정
        if (taskList.length === 0) {
            setCurrentTask(newTask.content);
        }
        
        // 완료 상태에서 새 작업이 추가되면 작업중 상태로 변경
        if (workStatus === '완료') {
            setWorkStatus('작업중');
        }
    };

    const handleStartTask = (taskId, taskContent) => {
        setActiveTaskId(taskId);
        setCurrentTask(taskContent);
        setWorkStatus('작업중');
        if (!workStartTime) {
            setWorkStartTime(new Date());
        }
    };

    const handleEditTask = (taskId, newContent) => {
        setTaskList(prev => prev.map(task => 
            task.id === taskId ? { ...task, content: newContent } : task
        ));
        // setEditingTask(null); // 이 줄을 제거하여 focus 유지
    };

    const handleDeleteTask = (taskId) => {
        setTaskList(prev => prev.filter(task => task.id !== taskId));
        setCompletedTasks(prev => prev.filter(id => id !== taskId));
        
        // 삭제된 작업이 현재 작업이면 첫 번째 작업으로 변경
        const deletedTask = taskList.find(task => task.id === taskId);
        if (deletedTask && deletedTask.content === currentTask) {
            const remainingTasks = taskList.filter(task => task.id !== taskId);
            if (remainingTasks.length > 0) {
                setCurrentTask(remainingTasks[0].content);
            } else {
                setCurrentTask('');
            }
        }
        
        // 삭제된 작업이 활성화된 작업이면 활성화 상태 해제
        if (activeTaskId === taskId) {
            setActiveTaskId(null);
            setWorkStatus('대기중');
        }
        
        // 작업 삭제 후 완료 상태 재확인
        const remainingCompletedTasks = completedTasks.filter(id => id !== taskId);
        const remainingTaskList = taskList.filter(task => task.id !== taskId);
        
        if (remainingCompletedTasks.length === remainingTaskList.length && remainingTaskList.length > 0) {
            setWorkStatus('완료');
        } else {
            setWorkStatus('작업중');
        }
    };

    // 버튼 텍스트와 스타일 결정
    const getButtonText = () => {
        if (workStatus === '대기중') return '작업 시작';
        if (workStatus === '작업중') return '작업일시중지';
        if (workStatus === '작업일시중지') return '작업재개';
        return '작업 시작';
    };

    const getButtonStyle = () => {
        if (workStatus === '대기중') {
            return { backgroundColor: '#28a745' };
        } else if (workStatus === '작업중') {
            return { backgroundColor: '#ffc107', color: '#333' };
        } else if (workStatus === '작업일시중지') {
            return { backgroundColor: '#17a2b8' };
        }
        return { backgroundColor: '#ccc' };
    };

    const getStatusColor = () => {
        if (workStatus === '작업중') return '#28a745';
        if (workStatus === '작업일시중지') return '#ffc107';
        if (workStatus === '작업완료') return '#28a745';
        if (workStatus === '완료') return '#007bff';
        return '#ffc107';
    };

    return (
        <Layout onLogout={onLogout}>
            <div style={{
                padding: '20px',
                backgroundColor: '#f5f5f5',
                minHeight: '100vh',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                {/* 헤더 */}
                <div style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    padding: '15px',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    textAlign: 'center',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>작업자 화면</h2>
                    <div style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                        서버연결됨
                    </div>
                </div>

                {/* 현재 작업 정보 또는 작업 완료 화면 */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                    {showCompletionScreen ? (
                        <>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>
                                작업 완료
                            </h3>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '14px', color: '#666' }}>작업 시작 시간:</span>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                                        {workStartTime ? workStartTime.toLocaleString() : '-'}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '14px', color: '#666' }}>작업 종료 시간:</span>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                                        {workEndTime ? workEndTime.toLocaleString() : '-'}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '14px', color: '#666' }}>달성률:</span>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#28a745' }}>
                                        {taskList.length > 0 ? Math.round((completedTasks.length / taskList.length) * 100) : 0}%
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleBackToWork}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    marginTop: '15px'
                                }}
                            >
                                작업 계속하기
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>
                                현재 작업
                            </h3>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <span style={{ fontSize: '14px', color: '#666' }}>작업명:</span>
                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                                    {currentTask}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '14px', color: '#666' }}>상태:</span>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    color: getStatusColor()
                                }}>
                                    {workStatus}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* 작업 제어 버튼 */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '20px'
                }}>
                    <button
                        onClick={handleWorkToggle}
                        disabled={workStatus === '완료'}
                        style={{
                            flex: 1,
                            padding: '15px',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: workStatus === '완료' ? 'not-allowed' : 'pointer',
                            ...getButtonStyle()
                        }}
                    >
                        {getButtonText()}
                    </button>
                    <button
                        onClick={handleCompleteWork}
                        disabled={taskList.length === 0 || showCompletionScreen}
                        style={{
                            flex: 1,
                            padding: '15px',
                            backgroundColor: (taskList.length > 0 && !showCompletionScreen) ? '#007bff' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: (taskList.length > 0 && !showCompletionScreen) ? 'pointer' : 'not-allowed'
                        }}
                    >
                        작업 종료
                    </button>
                </div>

                {/* 작업 목록 */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                            작업 목록
                        </h3>
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        {taskList.map((task) => (
                            <div
                                key={task.id}
                                style={{
                                    padding: '12px',
                                    backgroundColor: task.content === currentTask ? '#e3f2fd' : '#f8f9fa',
                                    borderRadius: '6px',
                                    border: task.content === currentTask ? '2px solid #007bff' : '1px solid #dee2e6',
                                    fontSize: '14px',
                                    color: '#333',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    position:"relative"
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, }}>
                                    <span style={{
                                        fontSize: '12px',
                                        color: '#666',
                                        minWidth: '20px',
                                        
                                    }}>
                                        {task.number}
                                    </span>
                                    {editingTask === task.id ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                                            <input
                                                type="text"
                                                value={task.content}
                                                onChange={(e) => handleEditTask(task.id, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        setEditingTask(null);
                                                    } else if (e.key === 'Escape') {
                                                        setEditingTask(null);
                                                    }
                                                }}
                                                onCompositionStart={() => setIsComposing(true)}
                                                onCompositionEnd={() => setIsComposing(false)}
                                                style={{
                                                    border: 'none',
                                                    outline: 'none',
                                                    fontSize: '14px',
                                                    color: '#333',
                                                    flex: 1,
                                                    textDecoration: completedTasks.includes(task.id) ? 'line-through' : 'none',
                                                    color: completedTasks.includes(task.id) ? '#6c757d' : '#333'
                                                }}
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => setEditingTask(null)}
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    backgroundColor: '#28a745',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="편집 완료"
                                            >
                                                ✓
                                            </button>
                                        </div>
                                    ) : (
                                        <span 
                                            style={{
                                                textDecoration: completedTasks.includes(task.id) ? 'line-through' : 'none',
                                                color: completedTasks.includes(task.id) ? '#6c757d' : '#333',
                                                flex: 1,
                                                cursor: showCompletionScreen ? 'default' : 'text'
                                            }}
                                            onClick={() => !showCompletionScreen && setEditingTask(task.id)}
                                        >
                                            {task.content}
                                        </span>
                                    )}
                                </div>
                                <div style={{ 
                                    display: editingTask === task.id ? 'none' : 'flex', 
                                    alignItems: 'center', 
                                    gap: '2px',
                                }}>
                                    <button
                                        onClick={() => handleStartTask(task.id, task.content)}
                                        disabled={activeTaskId === task.id || showCompletionScreen}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            backgroundColor: activeTaskId === task.id ? '#28a745' : '#6c757d',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            fontSize: '10px',
                                            cursor: (activeTaskId === task.id || showCompletionScreen) ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            opacity: (activeTaskId === task.id || showCompletionScreen) ? 0.7 : 1
                                        }}
                                        title={activeTaskId === task.id ? (completedTasks.includes(task.id) ? "작업완료" : "작업 진행중") : completedTasks.includes(task.id) ? "완료" : "작업 시작"}
                                    >
                                        {activeTaskId === task.id ? (completedTasks.includes(task.id) ? '완료' : '●') : completedTasks.includes(task.id) ? '완료' : '▶'}
                                    </button>
                                    <button
                                        onClick={() => handleTaskComplete(task.id)}
                                        disabled={showCompletionScreen}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            border: '2px solid #007bff',
                                            backgroundColor: completedTasks.includes(task.id) ? '#007bff' : 'white',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: showCompletionScreen ? 'not-allowed' : 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            opacity: showCompletionScreen ? 0.7 : 1
                                        }}
                                        title={completedTasks.includes(task.id) ? "완료" : "미완료"}
                                    >
                                        {completedTasks.includes(task.id) ? '✓' : ''}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        disabled={showCompletionScreen}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            backgroundColor: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            fontSize: '12px',
                                            cursor: showCompletionScreen ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: showCompletionScreen ? 0.7 : 1
                                        }}
                                        title="삭제"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* 작업 추가 버튼 - 하단 중앙 */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: '1px solid #e1e5e9'
                    }}>
                        <button
                            onClick={handleAddTask}
                            disabled={showCompletionScreen}
                            style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: showCompletionScreen ? '#ccc' : '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                cursor: showCompletionScreen ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                transition: 'all 0.3s ease',
                                opacity: showCompletionScreen ? 0.7 : 1
                            }}
                            title="새 작업 추가"
                            onMouseEnter={(e) => {
                                if (!showCompletionScreen) {
                                    e.target.style.transform = 'scale(1.1)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                            }}
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default WorkerMain;
