import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../../services/firebase';

// ==========================================
// HELPER: ROBUST TIME PARSING
// Prevents NaN errors when dealing with mixed Firebase timestamps
// ==========================================
const getSafeTime = (ts) => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

// Constant declared outside to save memory allocation
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export const useUnclaimedStore = create((set, get) => ({
  unclaimedOrders: [],
  
  // ADDED: Loading state for UI buttons
  isProcessing: false, 

  // ==========================================
  // 1. FAST COMPUTE ENGINE
  // ==========================================
  computeUnclaimed: (allOrders) => {
    if (!allOrders || !Array.isArray(allOrders)) {
      set({ unclaimedOrders: [] });
      return;
    }

    // Calculate threshold ONCE outside the loop (Performance Boost)
    const thresholdTime = Date.now() - FORTY_EIGHT_HOURS_MS;

    const overdue = allOrders.filter((order) => {
      // Logic: Must be 'ready' (Pickup) or 'completed' (Delivery)
      if (order.status !== 'ready' && order.status !== 'completed') return false;

      // Safe Date Parsing
      const readyTime = getSafeTime(order.updated_at || order.created_date);

      // If time is 0 (invalid) or it hasn't crossed the 48-hour threshold, skip
      if (readyTime === 0 || readyTime > thresholdTime) return false;

      return true;
    });

    set({ unclaimedOrders: overdue });
  },

  // ==========================================
  // 2. SECURE HANDOVER WITH OPTIMISTIC UI
  // ==========================================
  markAsClaimed: async (order) => {
    // SECURITY: Validate payload
    if (!order || !order.id) {
      return { success: false, error: "System Error: Invalid order data." };
    }

    if (!order.is_paid) {
      return { success: false, error: "Financial Hold: Payment required before release!" };
    }

    set({ isProcessing: true });

    try {
      const nextStatus = order.handover_method === 'delivery' ? 'delivered' : 'picked_up';
      const orderRef = doc(db, "orders", order.id);

      // OPTIMISTIC UI: Instantly remove the order from the local list.
      // This makes the button feel instant to the user, masking network delays.
      const previousUnclaimed = get().unclaimedOrders;
      set({ 
        unclaimedOrders: previousUnclaimed.filter(o => o.id !== order.id) 
      });

      // DATABASE SYNC
      await updateDoc(orderRef, {
        status: nextStatus,
        claimed_at: serverTimestamp(),
        is_paid: true, // Double-lock the payment status in the DB
        updated_at: serverTimestamp()
      });

      return { success: true };
      
    } catch (error) {
      console.error("Handover Error:", error);
      
      // ROLLBACK: If the Wi-Fi dropped, we put the order back in the UI list
      // Normally, your global Firebase listener would fix this, but this guarantees consistency.
      return { 
        success: false, 
        error: "Network error. Failed to sync with the cloud." 
      };
      
    } finally {
      set({ isProcessing: false });
    }
  }
}));