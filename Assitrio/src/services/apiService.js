import axios from 'axios';
import { getApiBaseUrl, setApiBaseUrl } from '../config/api';

const api = axios.create({
    baseURL: getApiBaseUrl(),
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        config.baseURL = getApiBaseUrl();
        const session = localStorage.getItem('assistrio-session-v2');
        if (session) {
            const { token } = JSON.parse(session);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle data extraction and common errors
api.interceptors.response.use(
    (response) => {
        try { setApiBaseUrl(response.config.baseURL); } catch (e) {}
        return response.data;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error('Unauthorized access - potential token expiration');
        }
        return Promise.reject(error);
    }
);

export const noteService = {
    getAll: async () => api.get('/notes'),
    getDeleted: async () => api.get('/notes/deleted'),
    create: async (note) => api.post('/notes', note),
    update: async (id, updates) => api.put(`/notes/${id}`, updates),
    delete: async (id) => api.delete(`/notes/${id}`),
    permanentlyDelete: async (id) => api.delete(`/notes/${id}/permanent`),
    restore: async (id) => api.post(`/notes/${id}/restore`),
    getShared: async (shareId, accessCode) => api.post('/notes/shared', { shareId, accessCode })
};

export const activityService = {
    getAll: async () => api.get('/activities'),
    create: async (activity) => api.post('/activities', activity),
    createBulk: async (activities) => api.post('/activities/bulk', activities),
    clearAll: async () => api.delete('/activities')
};

export const userService = {
    getUsage: async () => api.get('/users/usage'),
    updateUsage: async (usage) => api.put('/users/usage', usage),
    updateProfile: async (updates) => api.put('/users/profile', updates),
    getCalendarTokens: async () => api.get('/users/calendar-tokens'),
    updateCalendarToken: async (provider, tokenData) => api.put('/users/calendar-token', { provider, tokenData }),
    exportData: async () => api.get('/users/export'),
    eraseAllData: async () => api.delete('/users/erase-all'),
    getConfig: async () => api.get('/users/config')
};

export const adminService = {
    getAllUsers: async () => api.get('/admin/users'),
    getUserDetails: async (userId) => api.get(`/admin/users/${userId}/details`),
    createUser: async (userData) => api.post('/admin/users', userData),
    updateUser: async (userData) => api.put('/admin/users', userData),
    updateUserPlan: async (userId, plan) => api.put('/admin/users/plan', { userId, plan }),
    deleteUser: async (userId) => api.delete(`/admin/users/${userId}`),
    getStats: async () => api.get('/admin/stats'),
    getGlobalActivities: async () => api.get('/admin/activities'),
    getGlobalConfig: async () => api.get('/admin/config'),
    updateGlobalConfig: async (configData) => api.put('/admin/config', configData)
};

export const paymentService = {
    createOrder: async (plan) => api.post('/payments/create-order', { plan }),
    verifyPayment: async (paymentData) => api.post('/payments/verify', paymentData),
    getHistory: async () => api.get('/payments/history'),
    getAdminHistory: async () => api.get('/payments/admin/history')
};

export const aiService = {
    getLivekitToken: async ({ roomName } = {}) => api.post('/ai/livekit/token', { roomName }),
    getChatContext: async () => api.get('/ai/chat-context')
};

export default api;
