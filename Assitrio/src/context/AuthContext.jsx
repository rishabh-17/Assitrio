import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getApiBaseUrl, getApiBaseUrlCandidates, setApiBaseUrl } from '../config/api';
import { userService } from '../services/apiService';
import { setUsage } from '../services/usageTracker';
import { syncCalendarTokensFromBackend } from '../services/calendarService';

const AuthContext = createContext(null);
const AUTH_LOG_PREFIX = 'ASSISTRIO_AUTH';

// ── Default Users (seeded on first load) ──
const DEFAULT_USERS = [
  {
    id: 1,
    username: 'User1',
    password: 'Agent@123',
    displayName: 'User One',
    email: '',
    mobile: '',
    profilePhoto: '',
    plan: 'Premium',
    createdAt: new Date().toISOString()
  }
];

const STORAGE_KEYS = {
  users: 'assistrio-users-v2',
  session: 'assistrio-session-v2'
};

/**
 * Initialize users in localStorage if not present
 */
function getStoredUsers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.users);
    if (stored) return JSON.parse(stored);
    // Seed default users on first load
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

function getStoredSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.session);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

async function fetchJsonWithTimeout(url, options, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { }
    return { res, text, json };
  } finally {
    clearTimeout(timeout);
  }
}

function authLog(...args) {
  try {
    console.log(AUTH_LOG_PREFIX, ...args);
  } catch (e) {
  }
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(getStoredUsers);
  const [currentUser, setCurrentUser] = useState(getStoredSession);

  const saveUsers = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(newUsers));
  };

  const saveSession = (user) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.session);
    }
  };

  const login = useCallback(async (username, password) => {
    try {
      const bases = [getApiBaseUrl(), ...getApiBaseUrlCandidates()].filter(Boolean);
      const uniqueBases = [...new Set(bases)];
      authLog('login:start', { username: String(username || ''), baseCount: uniqueBases.length, bases: uniqueBases });

      let lastError = 'Server error';
      for (const base of uniqueBases) {
        try {
          authLog('login:try', { base });
          const { res, text, json } = await fetchJsonWithTimeout(`${base}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = json || {};
          authLog('login:result', { base, status: res.status, ok: res.ok, success: !!data.success, error: data.error || null });
          if (res.ok && data.success) {
            setApiBaseUrl(base);
            const session = { ...data.user, token: data.token };
            saveSession(session);
            userService.getUsage().then(r => setUsage(r.usage)).catch(console.error);
            syncCalendarTokensFromBackend().catch(console.error);
            authLog('login:success', { base, userId: session?.id, username: session?.username, role: session?.role });
            return { success: true, user: session };
          }

          lastError = data.error || (text ? `HTTP ${res.status}` : 'Login failed');
        } catch (e) {
          authLog('login:error', { base, message: typeof e?.message === 'string' ? e.message : String(e) });
          lastError = typeof e?.message === 'string' ? e.message : 'Network error';
        }
      }

      authLog('login:failed', { error: lastError });
      return { success: false, error: lastError };
    } catch (err) {
      authLog('login:fatal', { message: typeof err?.message === 'string' ? err.message : String(err) });
      return { success: false, error: typeof err?.message === 'string' ? err.message : 'Server error' };
    }
  }, []);

  const signup = useCallback(async (username, password, displayName) => {
    try {
      const bases = [getApiBaseUrl(), ...getApiBaseUrlCandidates()].filter(Boolean);
      const uniqueBases = [...new Set(bases)];
      authLog('signup:start', { username: String(username || ''), baseCount: uniqueBases.length, bases: uniqueBases });

      let lastError = 'Server error';
      for (const base of uniqueBases) {
        try {
          authLog('signup:try', { base });
          const { res, text, json } = await fetchJsonWithTimeout(`${base}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, displayName })
          });

          const data = json || {};
          authLog('signup:result', { base, status: res.status, ok: res.ok, success: !!data.success, error: data.error || null });
          if (res.ok && data.success) {
            setApiBaseUrl(base);
            const session = { ...data.user, token: data.token };
            saveSession(session);
            userService.getUsage().then(r => setUsage(r.usage)).catch(console.error);
            syncCalendarTokensFromBackend().catch(console.error);
            authLog('signup:success', { base, userId: session?.id, username: session?.username, role: session?.role });
            return { success: true, user: session };
          }

          lastError = data.error || (text ? `HTTP ${res.status}` : 'Signup failed');
        } catch (e) {
          authLog('signup:error', { base, message: typeof e?.message === 'string' ? e.message : String(e) });
          lastError = typeof e?.message === 'string' ? e.message : 'Network error';
        }
      }

      authLog('signup:failed', { error: lastError });
      return { success: false, error: lastError };
    } catch (err) {
      authLog('signup:fatal', { message: typeof err?.message === 'string' ? err.message : String(err) });
      return { success: false, error: typeof err?.message === 'string' ? err.message : 'Server error' };
    }
  }, []);

  const googleLogin = useCallback(async (credential) => {
    try {
      authLog('google:start');
      const payload = JSON.parse(
        atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      const { email, name, picture, sub } = payload;

      const bases = [getApiBaseUrl(), ...getApiBaseUrlCandidates()].filter(Boolean);
      const uniqueBases = [...new Set(bases)];
      authLog('google:bases', { baseCount: uniqueBases.length, bases: uniqueBases });

      let lastError = 'Google login failed';
      for (const base of uniqueBases) {
        try {
          authLog('google:try', { base, email: String(email || '') });
          const { res, text, json } = await fetchJsonWithTimeout(`${base}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, picture, sub })
          });

          const data = json || {};
          authLog('google:result', { base, status: res.status, ok: res.ok, success: !!data.success, error: data.error || null });
          if (res.ok && data.success) {
            setApiBaseUrl(base);
            const session = { ...data.user, token: data.token };
            saveSession(session);
            userService.getUsage().then(r => setUsage(r.usage)).catch(console.error);
            syncCalendarTokensFromBackend().catch(console.error);
            authLog('google:success', { base, userId: session?.id, username: session?.username, role: session?.role });
            return { success: true, user: session };
          }

          lastError = data.error || (text ? `HTTP ${res.status}` : 'Google login failed');
        } catch (e) {
          authLog('google:error', { base, message: typeof e?.message === 'string' ? e.message : String(e) });
          lastError = typeof e?.message === 'string' ? e.message : 'Network error';
        }
      }

      authLog('google:failed', { error: lastError });
      return { success: false, error: lastError };
    } catch (err) {
      console.error('Google login error:', err);
      authLog('google:fatal', { message: typeof err?.message === 'string' ? err.message : String(err) });
      return { success: false, error: 'Google sign-in failed. Please try again.' };
    }
  }, []);

  const logout = useCallback(() => {
    saveSession(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!currentUser) return;
    try {
      const updatedUser = await userService.updateProfile(updates);
      if (updatedUser) {
        const newSession = { ...currentUser, ...updatedUser };
        delete newSession.password;
        saveSession(newSession);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      login,
      signup,
      googleLogin,
      logout,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
