import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { userService } from '../services/apiService';
import { setUsage } from '../services/usageTracker';
import { syncCalendarTokensFromBackend } from '../services/calendarService';

const AuthContext = createContext(null);

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
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.success) {
        const session = { ...data.user, token: data.token };
        saveSession(session);
        // Load user context
        userService.getUsage().then(res => setUsage(res.usage)).catch(console.error);
        syncCalendarTokensFromBackend().catch(console.error);
        return { success: true, user: session };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (err) {
      return { success: false, error: 'Server error' };
    }
  }, []);

  const signup = useCallback(async (username, password, displayName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName })
      });
      const data = await response.json();
      if (data.success) {
        const session = { ...data.user, token: data.token };
        saveSession(session);
        // Load user context
        userService.getUsage().then(res => setUsage(res.usage)).catch(console.error);
        syncCalendarTokensFromBackend().catch(console.error);
        return { success: true, user: session };
      }
      return { success: false, error: data.error || 'Signup failed' };
    } catch (err) {
      return { success: false, error: 'Server error' };
    }
  }, []);

  const googleLogin = useCallback(async (credential) => {
    try {
      const payload = JSON.parse(
        atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      const { email, name, picture, sub } = payload;

      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, picture, sub })
      });
      const data = await response.json();
      if (data.success) {
        const session = { ...data.user, token: data.token };
        saveSession(session);
        // Load user context
        userService.getUsage().then(res => setUsage(res.usage)).catch(console.error);
        syncCalendarTokensFromBackend().catch(console.error);
        return { success: true, user: session };
      }
      return { success: false, error: data.error || 'Google login failed' };
    } catch (err) {
      console.error('Google login error:', err);
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
