import { Capacitor } from '@capacitor/core';

const API_BASE_URL_STORAGE_KEY = 'assistrio-api-base-url-v1';

function normalizeApiBaseUrl(value) {
    if (value === undefined || value === null) return '';
    let s = String(value).trim();
    if (!s) return '';
    s = s.replace(/\s+/g, '');
    s = s.replace(/^`+|`+$/g, '');
    s = s.replace(/^"+|"+$/g, '');
    s = s.replace(/^'+|'+$/g, '');
    s = s.replace(/\/+$/g, '');
    return s;
}

export function getApiBaseUrlCandidates() {
    const fromEnv = import.meta.env?.VITE_API_BASE_URL;
    if (fromEnv) return [normalizeApiBaseUrl(fromEnv)].filter(Boolean);

    try {
        if (Capacitor?.isNativePlatform?.() && Capacitor?.getPlatform?.() === 'android') {
            const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
            const isProbablyEmulator = /sdk_gphone|Android SDK built for|Emulator/i.test(ua);
            if (isProbablyEmulator) {
                return ['http://10.0.2.2:5050/api', 'http://4.186.31.52:5050/api'].map(normalizeApiBaseUrl).filter(Boolean);
            }
            return ['http://4.186.31.52:5050/api'].map(normalizeApiBaseUrl).filter(Boolean);
        }
    } catch (e) {
    }

    if (typeof window !== 'undefined') {
        const host = window.location?.hostname;
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
        const isAndroidWebView = /Android/i.test(ua);

        if (isAndroidWebView && (host === 'localhost' || host === '127.0.0.1')) {
            return ['http://10.0.2.2:5050/api', 'http://4.186.31.52:5050/api'].map(normalizeApiBaseUrl).filter(Boolean);
        }
        if (host === 'localhost' || host === '127.0.0.1') {
            return ['http://localhost:5050/api', 'http://4.186.31.52:5050/api'].map(normalizeApiBaseUrl).filter(Boolean);
        }
    }

    return ['http://4.186.31.52:5050/api'].map(normalizeApiBaseUrl).filter(Boolean);
}

export function getApiBaseUrl() {
    const fromEnv = normalizeApiBaseUrl(import.meta.env?.VITE_API_BASE_URL);
    if (fromEnv) return fromEnv;
    try {
        const saved = localStorage.getItem(API_BASE_URL_STORAGE_KEY);
        const normalized = normalizeApiBaseUrl(saved);
        if (normalized) return normalized;
    } catch (e) {
    }
    return getApiBaseUrlCandidates()[0];
}

export function setApiBaseUrl(url) {
    try {
        const normalized = normalizeApiBaseUrl(url);
        if (normalized) {
            localStorage.setItem(API_BASE_URL_STORAGE_KEY, normalized);
        }
    } catch (e) {
    }
}

export const API_BASE_URL = getApiBaseUrl();

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
