import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  aadhaarNumber?: string;
  subscriptionPlan?: string;
  isPremium?: boolean;
  isVerified?: boolean;
  idDocument?: string;
  referralCode?: string;
  referredById?: string | null;
  referralBalance?: number;
  referralEarnings?: number;
  credits?: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("token")));

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          localStorage.removeItem("token");
          setToken(null);
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
      } finally {
        window.clearTimeout(timeoutId);
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedFields: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...updatedFields } : null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error("Failed to refresh user", err);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
