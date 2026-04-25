import { create } from 'zustand';

interface AdminState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  token: localStorage.getItem('admin_token'),
  setToken: (token: string | null) => {
    if (token) localStorage.setItem('admin_token', token);
    else localStorage.removeItem('admin_token');
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('admin_token');
    set({ token: null });
  },
}));
