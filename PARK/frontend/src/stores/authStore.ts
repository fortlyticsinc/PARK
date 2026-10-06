/**
 * PARK — Auth Store
 * ========================
 * Fixed vs the original: token is now actually persisted to
 * localStorage (it wasn't before — refreshing the page silently
 * logged you out), and bootstrap() re-hydrates `user` from a saved
 * token by calling /v1/auth/me rather than just trusting a raw token.
 */
import { create } from "zustand";
import { api } from "@/lib/api";

const TOKEN_STORAGE_KEY = "p_ark_token";

interface User {
  id: string;
  email: string;
  role: "student" | "supervisor" | "coordinator" | "admin";
  full_name: string | null;
  department_id: string | null;
  institution_id: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => {
    api.setToken(token);
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    set({ token });
  },

  logout: () => {
    api.setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  bootstrap: async () => {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!saved) {
      set({ isLoading: false });
      return;
    }

    api.setToken(saved);
    set({ token: saved });

    const response = await api.get<User>("/v1/auth/me");
    if (response.data) {
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } else {
      get().logout();
      set({ isLoading: false });
    }
  },
}));
