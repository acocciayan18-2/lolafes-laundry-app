import { create } from 'zustand';
import { useOrderStore } from './useOrderStore';
import { useNotificationStore } from '../ui/useNotificationStore';

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const TERMINAL_STATUSES = ['picked_up', 'delivered'];
const VALID_STATUSES = ['pending', 'in_progress', 'ready', 'completed', ...TERMINAL_STATUSES];
const TERMINAL_LOCK_WINDOW_MS = 5 * 60 * 1000; // 5 Minutes

// ==========================================
// UTILITY HELPERS
// ==========================================

// TYPE GUARD: Ensures formatting doesn't crash if an unexpected type is passed
const formatStatus = (status) => {
  if (!status || typeof status !== 'string') return "Unknown Status";
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// DEFENSIVE PARSING: Safely extracts epoch timestamps from mixed Firestore/JS Date formats
const getSafeTime = (ts) => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

// ==========================================
// THE STORE
// ==========================================
export const useTodayOrdersStore = create((set, get) => ({
  // --- STATE ---
  selectedOrder: null,
  isUpdating: false,

  // --- ACTIONS ---
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  clearSelectedOrder: () => set({ selectedOrder: null }),

  /**
   * INTERNAL VALIDATOR
   * Strictly evaluates business rules before allowing database mutations.
   */
  validate: (order, newStatus) => {
    // 1. Data Integrity Checks
    if (!order || !order.id) {
      return { allowed: false, error: "Invalid order selection." };
    }
    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return { allowed: false, error: "Invalid or unrecognized status update." };
    }

    // 2. Redundancy Check
    if (order.status === newStatus) {
      return { allowed: false, error: `Order is already marked as ${formatStatus(newStatus)}.` };
    }

    // 3. Terminal Lock Rule (5-Minute Window)
    // Prevents tampering with completed orders after a brief correction window
    const isTerminal = TERMINAL_STATUSES.includes(order.status);
    if (isTerminal) {
      const terminalTime = getSafeTime(order.picked_up_at || order.delivered_at || order.updated_at);
      
      // Fallback: If time parsing fails entirely, lock it immediately as a safety precaution
      if (terminalTime === 0 || (Date.now() - terminalTime > TERMINAL_LOCK_WINDOW_MS)) {
        return { 
          allowed: false, 
          error: "Action Denied: Order is finalized and securely locked." 
        };
      }
    }

    // 4. Financial Security Rule: Payment before release
    const isHandoverStatus = TERMINAL_STATUSES.includes(newStatus);
    if (isHandoverStatus && !order.is_paid) {
      return { 
        allowed: false, 
        error: "Financial Hold: Order must be PAID before it can be handed over." 
      };
    }

    return { allowed: true };
  },

  executeStatusUpdate: async (newStatus) => {
    const state = get();
    
    // RACE CONDITION GUARD: Prevent double-submissions from impatient clicking
    if (state.isUpdating) return false;

    const { updateOrderStatus } = useOrderStore.getState();
    const { showNotification } = useNotificationStore.getState();

    // Run client-side validation
    const check = state.validate(state.selectedOrder, newStatus);
    if (!check.allowed) {
      showNotification(check.error, "error");
      return false;
    }

    set({ isUpdating: true });
    
    try {
      await updateOrderStatus(state.selectedOrder, newStatus);
      showNotification(`Order moved to ${formatStatus(newStatus)}`, "success");
      state.clearSelectedOrder();
      return true;
      
    } catch (error) {
      console.error("Status Update Failed:", error);
      
      // Extract specific validation errors from the main OrderStore if available
      const errorMessage = error instanceof Error && error.message 
        ? error.message 
        : "System error: Could not sync status.";
        
      showNotification(`❌ ${errorMessage}`, "error");
      return false;
      
    } finally {
      // Ensure the loading state is ALWAYS cleared, even on network failure
      set({ isUpdating: false });
    }
  }
}));