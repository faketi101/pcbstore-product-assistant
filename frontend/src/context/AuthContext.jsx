import React, { createContext, useState, useEffect } from "react";
import authService from "../services/api";
import config from "../config/api.config";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem("token");
      const storedUser = authService.getCurrentUser();

      if (!token || !storedUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Verify token is still valid by calling the server
        const response = await fetch(`${config.API_URL}/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setUser(storedUser);
        } else {
          // Token expired or invalid — clear and redirect
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setUser(null);
        }
      } catch {
        // Network error — use stored user as fallback
        setUser(storedUser);
      }
      setLoading(false);
    };

    verifySession();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      setUser(data);
      return data;
    } catch (error) {
      console.error("Login error", error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
