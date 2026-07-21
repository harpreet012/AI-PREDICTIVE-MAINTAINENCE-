import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    console.log("🗑️ Clearing auth data...");
    localStorage.removeItem('pm_access_token');
    localStorage.removeItem('pm_refresh_token');
    setUser(null);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const token = localStorage.getItem("pm_access_token");

      console.log("🚀 Initial Access Token:", token);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await authAPI.me();
        console.log("✅ /auth/me Response:", data);

        if (alive) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("❌ /auth/me Error:", err);

        if (alive) clear();
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [clear]);

  const save = useCallback((data) => {
    console.log("🔥 SAVE FUNCTION CALLED");
    console.log("📦 Backend Response:", data);

    localStorage.setItem("pm_access_token", data.accessToken);
    localStorage.setItem("pm_refresh_token", data.refreshToken);

    console.log(
      "✅ Saved Access Token:",
      localStorage.getItem("pm_access_token")
    );

    console.log(
      "✅ Saved Refresh Token:",
      localStorage.getItem("pm_refresh_token")
    );

    setUser(data.user);

    return data;
  }, []);

  const login = useCallback(async (email, password) => {
    console.log("📤 Sending Login Request...");

    const response = await authAPI.login(email, password);

    console.log("📥 Login API Response:", response.data);

    return save(response.data);
  }, [save]);

  const register = useCallback(async (name, email, password) => {
    const response = await authAPI.register(name, email, password);

    console.log("📥 Register Response:", response.data);

    return save(response.data);
  }, [save]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout(localStorage.getItem("pm_refresh_token"));
    } finally {
      clear();
    }
  }, [clear]);

  const logoutAll = useCallback(async () => {
    try {
      await authAPI.logoutAll();
    } finally {
      clear();
    }
  }, [clear]);

  const value = useMemo(
    () => ({
      user,
      loading,
      accessToken: localStorage.getItem("pm_access_token"),
      login,
      register,
      logout,
      logoutAll,
      isAdmin: user?.role === "admin",
    }),
    [user, loading, login, register, logout, logoutAll]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);