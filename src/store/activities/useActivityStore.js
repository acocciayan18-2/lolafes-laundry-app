// store/activities/useActivityStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useActivityStore = create(
  persist(
    (set) => ({
      activities: [],

      // order: the object containing details
      // status: the current status (pending, ready, etc)
      // metadata: { action: 'created' | 'status_update' | 'payment', label: 'Custom Text' }
      logActivity: (order, status, metadata = { action: 'status_update', label: '' }) => 
        set((state) => {
          const newActivity = {
            ...order,
            status: status,
            actionType: metadata.action,
            customLabel: metadata.label, // e.g., "Payment Received"
            activity_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          };

          return {
            activities: [newActivity, ...state.activities].slice(0, 50),
          };
        }),

      clearHistory: () => set({ activities: [] }),
    }),
    {
      name: 'laundry-activity-log',
      storage: createJSONStorage(() => localStorage),
    }
  )
);