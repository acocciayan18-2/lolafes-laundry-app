import { create } from 'zustand';
import { useOrderStore } from './useOrderStore';
import { useNotificationStore } from '../ui/useNotificationStore';

// ==========================================
// UTILITY HELPERS
// ==========================================
const formatStatus = (status) => {
  if (!status) return "";
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getSafeTime = (ts) => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

export const useTodayOrdersStore = create((set, get) => ({
  selectedOrder: null,
  isUpdating: false,

  setSelectedOrder: (order) => set({ selectedOrder: order }),
  clearSelectedOrder: () => set({ selectedOrder: null }),

  /**
   * INTERNAL VALIDATOR
   * Revised to allow skipping phases for faster workflow.
   */
  validate: (order, newStatus) => {
    if (!order) return { allowed: false, error: "No order selected." };
    if (!newStatus) return { allowed: false, error: "Invalid status update." };

    // 1. Redundancy Check
    if (order.status === newStatus) {
      return { allowed: false, error: `Order is already marked as ${formatStatus(newStatus)}.` };
    }

    // 2. Terminal Lock Rule (5-Minute Window)
    const isTerminal = ['picked_up', 'delivered'].includes(order.status);
    if (isTerminal) {
      const terminalTime = getSafeTime(order.picked_up_at || order.delivered_at || order.updated_at);
      const FIVE_MIN_MS = 5 * 60 * 1000;
      
      if (Date.now() - terminalTime > FIVE_MIN_MS) {
        return { 
          allowed: false, 
          error: "Action Denied: Order is securely locked." 
        };
      }
    }

    // 3. Financial Security Rule: Payment before release
    // ✨ We keep this! Even if skipping steps, it MUST be paid.
    const isHandoverStatus = ['picked_up', 'delivered'].includes(newStatus);
    if (isHandoverStatus && !order.is_paid) {
      return { 
        allowed: false, 
        error: "Financial Hold: Order must be PAID before it can be handed over." 
      };
    }

    // 4. ✨ LOGICAL FLOW PROTECTION REMOVED
    // The restriction preventing "Pending -> Picked Up" has been deleted 
    // to allow staff to bypass the "Ready" phase for urgent walk-ins.

    return { allowed: true };
  },

  executeStatusUpdate: async (newStatus) => {
    const { selectedOrder, validate, clearSelectedOrder } = get();
    const { updateOrderStatus } = useOrderStore.getState();
    const { showNotification } = useNotificationStore.getState();

    const check = validate(selectedOrder, newStatus);
    if (!check.allowed) {
      showNotification(check.error, "error");
      return false;
    }

    set({ isUpdating: true });
    
    try {
      await updateOrderStatus(selectedOrder, newStatus);
      showNotification(`Order moved to ${formatStatus(newStatus)}`, "success");
      clearSelectedOrder();
      return true;
    } catch (error) {
      console.error("Status Update Failed:", error);
      showNotification("System error: Could not sync status.", "error");
      return false;
    } finally {
      set({ isUpdating: false });
    }
  }
}));