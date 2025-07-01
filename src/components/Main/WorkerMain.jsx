import React, { useState } from 'react';
import Layout from '../Layouts/Woker/Layout';

const WorkerMain = ({ onLogout }) => {
    const [currentTask, setCurrentTask] = useState('작업 1');
    const [workStatus, setWorkStatus] = useState('대기중'); // '대기중', '작업중', '작업일시중지'
    const [completedTasks, setCompletedTasks] = useState([]); // 완료된 작업 목록
    const [taskList, setTaskList] = useState(['작업 1', '작업 2', '작업 3', '작업 4']); // 동적 작업 목록

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
        setWorkStatus('완료');
    };

    const handleTaskComplete = (taskName) => {
        let newCompletedTasks;
        if (completedTasks.includes(taskName)) {
            newCompletedTasks = completedTasks.filter(task => task !== taskName);
        } else {
            newCompletedTasks = [...completedTasks, taskName];
        }
        
        setCompletedTasks(newCompletedTasks);
        
        // 모든 작업이 완료되면 작업 상태를 '완료'로 변경
        if (newCompletedTasks.length === taskList.length) {
            setWorkStatus('완료');
        } else if (workStatus === '완료') {
            // 완료 상태에서 하나라도 체크가 해제되면 '작업중'으로 변경
            setWorkStatus('작업중');
        }
    };

    const handleAddTask = () => {
        const newTaskNumber = taskList.length + 1;
        const newTask = `작업 ${newTaskNumber}`;
        setTaskList(prev => [...prev, newTask]);
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
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>작업자 화면</h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                        현재 작업 상태 관리
                    </p>
                </div>

                {/* 현재 작업 정보 */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
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
                        disabled={completedTasks.length < 4}
                        style={{
                            flex: 1,
                            padding: '15px',
                            backgroundColor: completedTasks.length === 4 ? '#007bff' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: completedTasks.length === 4 ? 'pointer' : 'not-allowed'
                        }}
                    >
                        작업 완료
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
                        <button
                            onClick={handleAddTask}
                            style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            title="새 작업 추가"
                        >
                            +
                        </button>
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        {taskList.map((task, index) => (
                            <div
                                key={index}
                                style={{
                                    padding: '12px',
                                    backgroundColor: task === currentTask ? '#e3f2fd' : '#f8f9fa',
                                    borderRadius: '6px',
                                    border: task === currentTask ? '2px solid #007bff' : '1px solid #dee2e6',
                                    fontSize: '14px',
                                    color: '#333',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span style={{
                                    textDecoration: completedTasks.includes(task) ? 'line-through' : 'none',
                                    color: completedTasks.includes(task) ? '#6c757d' : '#333'
                                }}>
                                    {task}
                                </span>
                                <button
                                    onClick={() => handleTaskComplete(task)}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        border: '2px solid #007bff',
                                        backgroundColor: completedTasks.includes(task) ? '#007bff' : 'white',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {completedTasks.includes(task) ? '✓' : ''}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default WorkerMain;
