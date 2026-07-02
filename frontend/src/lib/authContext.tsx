"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AuthUser,
  authApi,
  clearSession,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from "./apiClient";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: {
    email: string;
    password: string;
    full_name: string;
    role?: "PATIENT" | "DOCTOR";
  }) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getToken();
      const storedUser = getStoredUser();
      setTokenState(storedToken);
      setUser(storedUser);
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setToken(res.token);
    setStoredUser(res.user);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      full_name: string;
      role?: "PATIENT" | "DOCTOR";
    }) => {
      const res = await authApi.register(input);
      return res.user;
    },
    []
  );

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    clearSession();
    setTokenState(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>.");
  }
  return ctx;
}

/**
 * Convenience hook: redirects to /login when not authenticated and
 * optionally enforces a required role.
 */
export function useRequireAuth(requiredRole?: AuthUser["role"]): AuthState {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) {
      router.replace("/login");
      return;
    }
    if (requiredRole && auth.user.role !== requiredRole) {
      router.replace(auth.user.role === "DOCTOR" ? "/doctor" : "/patient");
    }
  }, [auth.loading, auth.user, requiredRole, router]);

  return auth;
}
