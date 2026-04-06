export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5050/api';

export const getHeaders = () => {
    const session = localStorage.getItem('assistrio-session-v2');
    if (session) {
        const { token } = JSON.parse(session);
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }
    return {
        'Content-Type': 'application/json'
    };
};
