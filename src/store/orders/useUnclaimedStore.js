import { create } from 'zustand';
import { useOrderStore } from './useOrderStore';

// src/store/orders/useUnclaimedStore.js

export const useUnclaimedStore = create((set, get) => ({
  unclaimedOrders: [],
  
  computeUnclaimed: (allOrders) => {
    const now = new Date();
    //const OVERDUE_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000; // Change this temporarily to see your current orders
const OVERDUE_THRESHOLD_MS = 0;
    

    const overdue = allOrders.filter((order) => {
      // Ensure we are checking the correct status ('ready' or 'completed')
      if (order.status !== 'completed' && order.status !== 'ready') return false;

      const readyDate = order.updated_at?.seconds 
        ? new Date(order.updated_at.seconds * 1000) 
        : new Date(order.updated_at || order.created_date);

      return (now - readyDate) >= OVERDUE_THRESHOLD_MS;
    });

    set({ unclaimedOrders: overdue });
  },

  markAsClaimed: async (order) => {
    const { updateOrderStatus } = useOrderStore.getState();
    
    // 1. Validator: Payment Check
    if (!order.is_paid) {
      throw new Error("Cannot claim unpaid orders!");
    }

    // 2. Pass the FULL order object to the central store
    return await updateOrderStatus(order, 'picked_up');
  }
}));