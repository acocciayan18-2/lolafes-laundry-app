import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../../services/firebase';
import { useOrderStore } from '../orders/useOrderStore';

export const useUnclaimedStore = create((set, get) => {
  let liveInterval = null;

  return {
    unclaimedOrders: [],
    isProcessing: false,

    // ==========================================
    // 1. REAL-TIME ENGINE
    // ==========================================
    initRealtimeMonitoring: () => {
      if (liveInterval) clearInterval(liveInterval);

      // ⏱️ PRODUCTION UPDATE: Run every 1 minute (60,000ms)
      // This is perfect for 48-hour thresholds.
      liveInterval = setInterval(() => {
        const allOrders = useOrderStore.getState().orders;
        get().computeUnclaimed(allOrders);
      }, 60000); 
    },

    stopMonitoring: () => {
      if (liveInterval) clearInterval(liveInterval);
    },

    computeUnclaimed: (allOrders) => {
      if (!allOrders || !Array.isArray(allOrders)) {
        set({ unclaimedOrders: [] });
        return;
      }

      const { isOrderUnclaimed } = useOrderStore.getState();
      
      // Filter the existing orders in memory
      const overdue = allOrders.filter((order) => isOrderUnclaimed(order));

      // ⚡ PERFORMANCE: Only update state if the list actually changed
      // This prevents React from re-rendering the whole page every minute 
      // if no new orders became unclaimed.
      const currentIds = get().unclaimedOrders.map(o => o.id).join(',');
      const nextIds = overdue.map(o => o.id).join(',');

      if (currentIds !== nextIds) {
        set({ unclaimedOrders: overdue });
      }
    },

    // ==========================================
    // 2. ACTIONS
    // ==========================================
    markAsClaimed: async (order) => {
      if (!order || !order.id) return { success: false, error: "Invalid data." };
      if (!order.is_paid) return { success: false, error: "Payment required!" };

      set({ isProcessing: true });
      try {
        const nextStatus = order.handover_method === 'delivery' ? 'delivered' : 'picked_up';
        const orderRef = doc(db, "orders", order.id);

        set({ unclaimedOrders: get().unclaimedOrders.filter(o => o.id !== order.id) });

        await updateDoc(orderRef, {
          status: nextStatus,
          updated_at: serverTimestamp(),
          ...(nextStatus === 'picked_up' ? { picked_up_at: serverTimestamp() } : { delivered_at: serverTimestamp() })
        });

        return { success: true };
      } catch (error) {
        console.error("Claim Error:", error);
        return { success: false, error: "Handover failed." };
      } finally {
        set({ isProcessing: false });
      }
    }
  };
});