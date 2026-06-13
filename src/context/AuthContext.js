import React, {
  createContext, useContext,
  useState, useEffect, useRef
} from 'react';
import { AppState } from 'react-native';
import {
  saveAuthData, clearAuthData,
  getOwner, isLoggedIn,
  getAccessToken, isTokenExpiringSoon,
  updateAccessToken, getRefreshToken,
} from '../services/authStorage';
import { loginApi, registerApi, logoutApi } from '../services/api';

const AuthContext    = createContext();
const CHECK_INTERVAL  = 60000;
const REFRESH_THRESHOLD = 120000;

export const AuthProvider = ({ children }) => {

  const [owner,   setOwner]   = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef              = useRef(null);
  const appStateRef           = useRef(AppState.currentState);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const loggedIn = await isLoggedIn();
        console.log('Getting owner from AsyncStorage...');

        if (loggedIn) {
          const storedOwner = await getOwner();
          console.log('Owner data retrieved:', storedOwner);

          if (storedOwner && storedOwner.id) {
            setOwner(storedOwner);          // ← Set owner first
            startTokenRefreshTimer();
          }
        }
      } catch (e) {
        console.error('checkLogin error:', e.message);
      } finally {
        setLoading(false);                  // ← THEN set loading false
      }
    };

    checkLogin();
    return () => stopTokenRefreshTimer();
  }, []);

  // ── Handle app resume
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          await checkAndRefreshToken();
        }
        appStateRef.current = nextAppState;
      }
    );
    return () => subscription.remove();
  }, []);

  const startTokenRefreshTimer = () => {
    stopTokenRefreshTimer();
    timerRef.current = setInterval(async () => {
      await checkAndRefreshToken();
    }, CHECK_INTERVAL);
  };

  const stopTokenRefreshTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const checkAndRefreshToken = async () => {
    try {
      const expiringSoon = await isTokenExpiringSoon(REFRESH_THRESHOLD);
      if (expiringSoon) {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) { forceLogout(); return; }

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.6:8080'}/api/auth/refresh`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ refreshToken }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          await updateAccessToken(data.data.accessToken);
          console.log('✅ Token refreshed in background');
        } else {
          forceLogout();
        }
      }
    } catch (e) {
      console.error('checkAndRefreshToken error:', e.message);
    }
  };

  // ── LOGIN
  const login = async (phone, password) => {
    console.log('Attempting login with: in context', phone);
    const data = await loginApi(phone, password);
    console.log('Login API response:', data); // Debugging log
    if (!data.success) throw new Error(data.message);

    await saveAuthData(data.data);

    const ownerData = {
      id:      data.data.ownerId,
      name:    data.data.name,
      phone:   data.data.phone,
      address: data.data.address,
    };

    setOwner(ownerData);
    startTokenRefreshTimer();
    return data.data;
  };

  // ── REGISTER
  const register = async (name, phone, address, password) => {
    const data = await registerApi(name, phone, address, password);
    if (!data.success) throw new Error(data.message);

    await saveAuthData(data.data);

    const ownerData = {
      id:      data.data.ownerId,
      name:    data.data.name,
      phone:   data.data.phone,
      address: data.data.address,
    };

    setOwner(ownerData);
    startTokenRefreshTimer();
    return data.data;
  };

  // ── LOGOUT
  const logout = async () => {
    try {
      const accessToken = await getAccessToken();
      await logoutApi(accessToken);
    } catch (e) {
      console.error('logout error:', e.message);
    } finally {
      stopTokenRefreshTimer();
      await clearAuthData();
      setOwner(null);
    }
  };

  // ── FORCE LOGOUT
  const forceLogout = async () => {
    stopTokenRefreshTimer();
    await clearAuthData();
    setOwner(null);
  };

  return (
    <AuthContext.Provider value={{
      owner,
      loading,
      login,
      register,
      logout,
      forceLogout,
      isAuthenticated: !!owner,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);