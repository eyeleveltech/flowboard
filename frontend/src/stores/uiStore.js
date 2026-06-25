import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  activeClientFilter: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setActiveClientFilter: (id) => set({ activeClientFilter: id }),
}));
