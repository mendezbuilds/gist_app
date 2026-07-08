import { create } from 'zustand';

type MessagingState = {
  unreadCounts: Record<string, number>;
  setUnreadCounts: (counts: Record<string, number>) => void;
  incrementUnread: (chatId: string) => void;
  clearUnread: (chatId: string) => void;
};

export const useMessagingStore = create<MessagingState>((set) => ({
  unreadCounts: {},
  setUnreadCounts: (counts) => set({ unreadCounts: counts }),
  incrementUnread: (chatId) => set((state) => ({ 
    unreadCounts: { ...state.unreadCounts, [chatId]: (state.unreadCounts[chatId] || 0) + 1 }
  })),
  clearUnread: (chatId) => set((state) => ({ 
    unreadCounts: { ...state.unreadCounts, [chatId]: 0 }
  }))
}));
