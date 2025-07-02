import axios from './axios';

// 작업자 정보 가져오기
export const getWorkerInfo = async (workerId) => {
    try {
        const response = await axios.get('/dataset/woker-sample.json');
        const workerData = response.data.workers.find(worker => worker.workerId === workerId);
        return workerData;
    } catch (error) {
        console.error('작업자 정보 가져오기 실패:', error);
        return null;
    }
};

// 모든 작업자 정보 가져오기
export const getAllWorkersInfo = async () => {
    try {
        const response = await axios.get('/dataset/woker-sample.json');
        return response.data;
    } catch (error) {
        console.error('작업자 정보 가져오기 실패:', error);
        return null;
    }
};

// 작업자 이동 데이터 가져오기
export const getWorkerMovements = async () => {
    try {
        const response = await axios.get('/dataset/worker-movement.json');
        return response.data;
    } catch (error) {
        console.error('작업자 이동 데이터 가져오기 실패:', error);
        return null;
    }
}; 