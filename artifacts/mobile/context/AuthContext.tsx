import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, storeToken, clearToken, getStoredToken, ApiError } from "@/lib/api";

export type UserRole = "admin" | "employee";

export type PlanType = "free" | "pro" | "business";
export type PlanStatus = "active" | "inactive" | "trialing" | "past_due" | "canceled";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hourlyRate?: string;
  phone?: string | null;
  position?: string | null;
  avatarUrl?: string | null;
  companyId: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string | null;
  plan?: PlanType;
  planStatus?: PlanStatus;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  register: (
    companyName: string,
    adminName: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const USER_KEY = "paintpro_user_v2";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const stored = await AsyncStorage.getItem(USER_KEY);
      const token = await getStoredToken();

      if (stored && token) {
        const parsed: AuthUser = JSON.parse(stored);
        setUser(parsed);
        // Refresh user data from API in background
        refreshUser(parsed);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshUser(current: AuthUser) {
    try {
      const data = await apiFetch<AuthUser>("/auth/me");
      const updated = { ...current, ...data };
      setUser(updated);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    } catch {
      // Token expired or invalid — log out
      await logout();
    }
  }

  async function login(email: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
    try {
      const data = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });
      await storeToken(data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      return { success: false, error: message };
    }
  }

  async function register(
    companyName: string,
    adminName: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await apiFetch<LoginResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ companyName, adminName, email, password }),
        skipAuth: true,
      });
      await storeToken(data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Registration failed. Please try again.";
      return { success: false, error: message };
    }
  }

  async function logout() {
    setUser(null);
    await clearToken();
    await AsyncStorage.removeItem(USER_KEY);
  }

  function updateUser(updates: Partial<AuthUser>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
