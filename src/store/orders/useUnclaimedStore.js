import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../../services/firebase';
import { useOrderStore } from '../orders/useOrderStore';

// ==========================================
// UTILITIES
// ==========================================


const generateOrderHash = (orders) => {
  if (!Array.isArray(orders)) return "";
  return orders
    .map(o => `${o.id}:${o.status}:${o.is_paid}:${o.payment_method}:${o.handover_method}:${o.updated_at}`)
    .join('|');
};

// ==========================================
// THE STORE
// ==========================================
export const useUnclaimedStore = create((set, get) => {
  let liveInterval = null;

  return {
    // --- STATE ---
    unclaimedOrders: [],
    isProcessing: false,

    // ==========================================
    // 1. REAL-TIME ENGINE
    // ==========================================
    initRealtimeMonitoring: () => {
      if (liveInterval) clearInterval(liveInterval);

      // Run every 1 minute (60,000ms) to recalculate the 48-hour thresholds
      liveInterval = setInterval(() => {
        const allOrders = useOrderStore.getState().orders;
        get().computeUnclaimed(allOrders);
      }, 60000); 
    },

    stopMonitoring: () => {
      if (liveInterval) {
        clearInterval(liveInterval);
        liveInterval = null;
      }
    },

    computeUnclaimed: (allOrders) => {
      if (!Array.isArray(allOrders)) {
        if (get().unclaimedOrders.length > 0) set({ unclaimedOrders: [] });
        return;
      }

      const { isOrderUnclaimed } = useOrderStore.getState();
      
      // DATA GUARD: Safely filter orders, ignoring malformed objects
      const overdue = allOrders.filter((order) => {
        if (!order || typeof order !== 'object') return false;
        return isOrderUnclaimed(order);
      });

      // PERFORMANCE & ACCURACY: Compare specific state fingerprints
      const currentHash = generateOrderHash(get().unclaimedOrders);
      const nextHash = generateOrderHash(overdue);

      if (currentHash !== nextHash) {
        set({ unclaimedOrders: overdue });
      }
    },

    // ==========================================
    // 2. ACTIONS
    // ==========================================
    markAsClaimed: async (order) => {
      // 1. Strict Input Validation
      if (!order || typeof order !== 'object' || !order.id) {
        return { success: false, error: "Invalid order data provided." };
      }
      if (['picked_up', 'delivered'].includes(order.status)) {
        return { success: false, error: "Order has already been claimed." };
      }
      if (!order.is_paid) {
        return { success: false, error: "Payment must be collected before handover." };
      }

      // 2. Concurrency Lock: Prevent double-execution
      if (get().isProcessing) {
        return { success: false, error: "Please wait, processing previous request." };
      }

      set({ isProcessing: true });

      // 3. Snapshot for UI Rollback
      const previousOrdersState = get().unclaimedOrders;
      
      try {
        const nextStatus = order.handover_method === 'delivery' ? 'delivered' : 'picked_up';
        const orderRef = doc(db, "orders", String(order.id).trim());

        // 4. Optimistic UI Update (Makes the app feel instantly responsive)
        set({ unclaimedOrders: previousOrdersState.filter(o => o.id !== order.id) });

        // 5. Build and execute Database payload
        const updatePayload = {
          status: nextStatus,
          updated_at: serverTimestamp(),
        };
        
        if (nextStatus === 'picked_up') {
          updatePayload.picked_up_at = serverTimestamp();
        } else {
          updatePayload.delivered_at = serverTimestamp();
        }

        await updateDoc(orderRef, updatePayload);

        return { success: true };
        
      } catch (error) {
        console.error("Claim Error:", error);
        
        // 6. Rollback Sequence: If network fails, restore the UI so the user can try again
        set({ unclaimedOrders: previousOrdersState });
        
        return { 
          success: false, 
          error: error.code === 'permission-denied' 
            ? "Unauthorized: You lack permission to update this order." 
            : "Handover failed due to a network connection error." 
        };
        
      } finally {
        // ALWAYS release the lock, even on error
        set({ isProcessing: false });
      }
    }
  };
});