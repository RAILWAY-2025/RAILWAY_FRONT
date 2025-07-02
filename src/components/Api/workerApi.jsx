import axios from './axios';

// 작업자 정보 가져오기
export const getWorkerInfo = async (workerId) => {
    try {
        const response = await axios.get(`${process.env.PUBLIC_URL}/dataset/woker-sample.json`);
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
        const response = await axios.get(`${process.env.PUBLIC_URL}/dataset/woker-sample.json`);
        return response.data;
    } catch (error) {
        console.error('작업자 정보 가져오기 실패:', error);
        return null;
    }
}; 