import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useActivityStore = create(
  persist(
    (set) => ({
      activities: [],

     logActivity: (order, status, metadata = { action: 'status_update', label: '' }) => {
  // 1. FILTER: If it's just a generic pending update (not the initial creation), skip it
  if (metadata.action === 'status_update' && status.toLowerCase() === 'pending' && !metadata.label) {
    return; 
  }

  const activity_id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  set((state) => {
    // 2. DEDUPLICATION: Don't log the same action twice in a row
    const lastActivity = state.activities[0];
    if (
      lastActivity && 
      lastActivity.order_number === order.order_number && 
      lastActivity.actionType === metadata.action
    ) {
      return state;
    }

    const newActivity = {
      ...order,
      status: status,
      actionType: metadata.action,
      customLabel: metadata.label,
      activity_id,
      timestamp,
    };

    return {
      activities: [newActivity, ...state.activities].slice(0, 50),
    };
  });
},

      clearHistory: () => set({ activities: [] }),
    }),
    {
      name: 'laundry-activity-log',
      storage: createJSONStorage(() => localStorage),
    }
  )
);