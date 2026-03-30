'use client';

import { create } from 'zustand';

interface AppState {
  selectedProjectId: string | null;
  searchQuery: string;
  inboxTab: 'messages' | 'announcements' | 'approvals';
  sidebarOpen: boolean;
  setSelectedProject: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setInboxTab: (tab: 'messages' | 'announcements' | 'approvals') => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedProjectId: null,
  searchQuery: '',
  inboxTab: 'messages',
  sidebarOpen: true,
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setInboxTab: (tab) => set({ inboxTab: tab }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
