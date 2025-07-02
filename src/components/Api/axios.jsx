import axios from 'axios';

const instance = axios.create({
    baseURL: process.env.PUBLIC_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

export default instance; 