import { create } from 'zustand';
import { useOrderStore } from './useOrderStore';

export const useUnclaimedStore = create((set, get) => ({
  unclaimedOrders: [],
  
  computeUnclaimed: (allOrders) => {
    const now = new Date();
    
    // --- TEST THRESHOLD: 5 SECONDS ---
    const OVERDUE_THRESHOLD_MS = 5000; 

    const overdue = allOrders.filter((order) => {
      // 1. Logic Check: Must be in a "Waiting" state
      if (order.status !== 'completed' && order.status !== 'ready') return false;

      // 2. Safe Date Parsing (Handling Firebase Timestamps or Strings)
      const readyDate = order.updated_at?.seconds 
        ? new Date(order.updated_at.seconds * 1000) 
        : new Date(order.updated_at || order.created_date);

      // 3. Comparison
      return (now - readyDate) >= OVERDUE_THRESHOLD_MS;
    });

    set({ unclaimedOrders: overdue });
  },

  markAsClaimed: async (order) => {
    const { updateOrderStatus } = useOrderStore.getState();
    
    if (!order.is_paid) {
      throw new Error("Cannot claim unpaid orders!");
    }

    return await updateOrderStatus(order, 'picked_up');
  }
}));