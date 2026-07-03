import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://chatflow-production-0ccc.up.railway.app/api';
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Automatically attach token to every request
api.interceptors.request.use((config)=>{
    const token = localStorage.getItem('token');
    if(token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
})

export default api;
