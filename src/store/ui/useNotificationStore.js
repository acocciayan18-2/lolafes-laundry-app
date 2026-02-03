// store/ui/useNotificationStore.js
import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  message: null,
  type: 'info', // 'success' or 'error'
  
  showNotification: (message, type = 'success') => {
    set({ message, type });
  },
  
  hideNotification: () => {
    set({ message: null });
  }
}));