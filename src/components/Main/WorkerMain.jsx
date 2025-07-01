import React, { useState } from 'react';
import Layout from '../Layouts/Woker/Layout';

const WorkerMain = () => {
    const [currentTask, setCurrentTask] = useState('작업 1');
    const [workStatus, setWorkStatus] = useState('대기중');

    const handleStartWork = () => {
        setWorkStatus('작업중');
    };

    const handleCompleteWork = () => {
        setWorkStatus('완료');
    };

    return (
        <Layout>
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
                            color: workStatus === '작업중' ? '#28a745' : 
                                   workStatus === '완료' ? '#007bff' : '#ffc107'
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
                        onClick={handleStartWork}
                        disabled={workStatus === '작업중' || workStatus === '완료'}
                        style={{
                            flex: 1,
                            padding: '15px',
                            backgroundColor: workStatus === '대기중' ? '#28a745' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: workStatus === '대기중' ? 'pointer' : 'not-allowed'
                        }}
                    >
                        작업 시작
                    </button>
                    <button
                        onClick={handleCompleteWork}
                        disabled={workStatus !== '작업중'}
                        style={{
                            flex: 1,
                            padding: '15px',
                            backgroundColor: workStatus === '작업중' ? '#007bff' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: workStatus === '작업중' ? 'pointer' : 'not-allowed'
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
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>
                        작업 목록
                    </h3>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        {['작업 1', '작업 2', '작업 3', '작업 4'].map((task, index) => (
                            <div
                                key={index}
                                style={{
                                    padding: '12px',
                                    backgroundColor: task === currentTask ? '#e3f2fd' : '#f8f9fa',
                                    borderRadius: '6px',
                                    border: task === currentTask ? '2px solid #007bff' : '1px solid #dee2e6',
                                    fontSize: '14px',
                                    color: '#333'
                                }}
                            >
                                {task}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default WorkerMain;
