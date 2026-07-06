import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    timeout: 30000,
});

// Request interceptor — attach token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('hms_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
    response => response,
    async error => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            const refresh = localStorage.getItem('hms_refresh');
            if (refresh) {
                try {
                    const res = await axios.post(
                        `${api.defaults.baseURL}/api/auth/refresh`,
                        {},
                        { headers: { Authorization: `Bearer ${refresh}` } }
                    );
                    const newToken = res.data.access_token;
                    localStorage.setItem('hms_token', newToken);
                    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                    original.headers['Authorization'] = `Bearer ${newToken}`;
                    return api(original);
                } catch {
                    localStorage.clear();
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
