import { create } from 'zustand';
import { useOrderStore } from './useOrderStore';
import { useNotificationStore } from '../ui/useNotificationStore';

// ==========================================
// UTILITY HELPERS
// ==========================================
// Formats strings like "in_progress" to "In Progress"
const formatStatus = (status) => {
  if (!status) return "";
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Safely parses Firebase Timestamps, Date strings, and Unix epochs
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
  
  // ADDED: Explicit clear function for cleaner component unmounts
  clearSelectedOrder: () => set({ selectedOrder: null }),

  /**
   * STRICT INTERNAL VALIDATOR
   * Acts as a firewall before any database writes are attempted.
   */
  validate: (order, newStatus) => {
    if (!order) return { allowed: false, error: "No order selected." };
    if (!newStatus) return { allowed: false, error: "Invalid status update." };

    // 1. Redundancy Check
    if (order.status === newStatus) {
      return { allowed: false, error: `Order is already marked as ${formatStatus(newStatus)}.` };
    }

    // 2. Terminal Lock Rule (5-Minute Window for Corrections)
    // ADDED 'delivered' to ensure both handover methods are protected
    const isTerminal = ['picked_up', 'delivered'].includes(order.status);
    if (isTerminal) {
      const terminalTime = getSafeTime(order.picked_up_at || order.delivered_at || order.updated_at);
      const FIVE_MIN_MS = 5 * 60 * 1000;
      
      if (Date.now() - terminalTime > FIVE_MIN_MS) {
        return { 
          allowed: false, 
          error: "Action Denied: Completed orders securely lock after 5 minutes." 
        };
      }
    }

    // 3. Financial Security Rule: Payment before release
    const isHandoverStatus = ['picked_up', 'delivered'].includes(newStatus);
    if (isHandoverStatus && !order.is_paid) {
      return { 
        allowed: false, 
        error: "Financial Hold: Order must be PAID before it can be handed over." 
      };
    }

    // 4. NEW: Logical Flow Protection
    // Prevents accidentally clicking "Picked Up" on an order that hasn't been washed yet
    if (order.status === 'pending' && isHandoverStatus) {
       return {
         allowed: false,
         error: "Process Error: Cannot skip directly to handover from Pending."
       };
    }

    return { allowed: true };
  },

  executeStatusUpdate: async (newStatus) => {
    const { selectedOrder, validate, clearSelectedOrder } = get();
    // Dynamically fetch external states to prevent circular dependency issues
    const { updateOrderStatus } = useOrderStore.getState();
    const { showNotification } = useNotificationStore.getState();

    // 1. Run strict validation
    const check = validate(selectedOrder, newStatus);
    if (!check.allowed) {
      showNotification(check.error, "error");
      return false; // Return a boolean so the UI can react (e.g., shake the button)
    }

    set({ isUpdating: true });
    
    try {
      // 2. Execute database update
      await updateOrderStatus(selectedOrder, newStatus);
      
      // 3. Success UI Feedback
      showNotification(`Order moved to ${formatStatus(newStatus)}`, "success");
      clearSelectedOrder();
      return true;
      
    } catch (error) {
      // Log the actual error for developers, show clean message to users
      console.error("Status Update Failed:", error);
      showNotification("System error: Could not sync status with cloud.", "error");
      return false;
      
    } finally {
      set({ isUpdating: false });
    }
  }
}));