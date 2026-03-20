import { create } from 'zustand';
import { useOrderStore } from './useOrderStore';
import { useNotificationStore } from '../ui/useNotificationStore';

// ==========================================
// CONFIGURATION & CONSTANTS (Frozen)
// ==========================================
/**
 * @constant TERMINAL_STATUSES
 * @description States representing the absolute end of the order lifecycle.
 */
const TERMINAL_STATUSES = Object.freeze(['picked_up', 'delivered']);

/**
 * @constant VALID_STATUSES
 * @description Master list of allowed state transitions.
 */
const VALID_STATUSES = Object.freeze([
  'pending', 
  'in_progress', 
  'ready', 
  'completed', 
  ...TERMINAL_STATUSES,
  'cancelled'
]);

/**
 * @constant TERMINAL_LOCK_WINDOW_MS
 * @description Time window (5 minutes) allowing correction of a terminal status.
 */
const TERMINAL_LOCK_WINDOW_MS = 5 * 60 * 1000; 

// ==========================================
// UTILITY HELPERS
// ==========================================

/**
 * Safely formats status strings for UI display.
 * @param {string} status 
 * @returns {string} Capitalized, space-separated string.
 */
const formatStatus = (status) => {
  if (!status || typeof status !== 'string') return "Unknown Status";
  // O(N) where N is word count. Fast enough for small status strings.
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

/**
 * Safely parses heterogeneous date formats (Firestore Timestamps, JS Dates, Strings, Integers)
 * into a reliable Epoch timestamp.
 * @param {any} ts - The unknown timestamp payload.
 * @returns {number} Epoch timestamp in milliseconds. Returns 0 if invalid.
 */
const getSafeTime = (ts) => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  
  // Firestore Timestamp handling
  if (ts && typeof ts === 'object') {
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (ts.seconds) return ts.seconds * 1000;
  }
  
  // String or JS Date handling
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
};


// ==========================================
// THE STORE
// ==========================================
/**
 * @store useTodayOrdersStore
 * @description Manages transient UI state and business logic validation for active daily orders.
 */
export const useTodayOrdersStore = create((set, get) => ({
  
  // --- STATE ---
  selectedOrder: null,
  isUpdating: false,

  // --- ACTIONS ---

  /**
   * Safely sets the active order for the modal.
   * Prevents overwriting if an update is currently in progress.
   * @param {Object} order - The order object.
   */
  setSelectedOrder: (order) => {
    if (get().isUpdating) return; 
    set({ selectedOrder: order });
  },

  /**
   * Clears the active order, closing modals.
   */
  clearSelectedOrder: () => {
    if (get().isUpdating) return;
    set({ selectedOrder: null });
  },

  /**
   * @function validate
   * @description STRICT FRONTEND VALIDATION
   * Checks business rules before allowing database mutations.
   * * ⚠️ ARCHITECTURE NOTE (Frontend vs Backend):
   * This validation is strictly for UI/UX gating (disabling buttons, showing tooltips).
   * It DOES NOT guarantee security. A malicious user can bypass this store and call
   * Firebase directly. The authoritative version of this logic MUST exist in
   * Firestore Security Rules or Cloud Functions.
   * * @param {Object} order 
   * @param {string} newStatus 
   * @returns {{allowed: boolean, error?: string}}
   */
  validate: (order, newStatus) => {
    // 1. Data Integrity Guards
    if (!order || typeof order !== 'object' || !order.id) {
      return { allowed: false, error: "Invalid order data payload." };
    }
    if (!newStatus || typeof newStatus !== 'string' || !VALID_STATUSES.includes(newStatus)) {
      return { allowed: false, error: "System Error: Unrecognized status transition." };
    }

    // 2. Redundancy Guard
    if (order.status === newStatus) {
      return { allowed: false, error: `Order is already marked as ${formatStatus(newStatus)}.` };
    }

    // 3. Immutability/Terminal Lock Guard
    if (TERMINAL_STATUSES.includes(order.status) || order.status === 'cancelled') {
      const terminalTime = getSafeTime(order.picked_up_at || order.delivered_at || order.cancelled_at || order.updated_at);
      
      if (terminalTime === 0 || (Date.now() - terminalTime > TERMINAL_LOCK_WINDOW_MS)) {
        return { 
          allowed: false, 
          error: "Action Denied: Order is finalized and securely locked." 
        };
      }
    }

    // 4. Financial Security Guard
    if (TERMINAL_STATUSES.includes(newStatus) && order.is_paid !== true) {
      return { 
        allowed: false, 
        error: "Financial Hold: Order must be PAID before handover." 
      };
    }

    return { allowed: true };
  },

  /**
   * @function executeStatusUpdate
   * @description Orchestrates the status update process, invoking validation, 
   * global stores, and error handling.
   * @param {string} newStatus 
   * @param {string} [paymentMethod=null] - Optional override if updating status forces a payment resolution
   * @param {number|string} [amountTendered=null] - Smart Cash Metric passing
   * @returns {Promise<boolean>} Success indicator.
   */
  executeStatusUpdate: async (newStatus, paymentMethod = null, amountTendered = null) => {
    const state = get();
    
    // RACE CONDITION & IDEMPOTENCY GUARD
    if (state.isUpdating || !state.selectedOrder) return false;

    // Cache instances to prevent React re-renders during async execution
    const orderStore = useOrderStore.getState();
    const notificationStore = useNotificationStore.getState();

    // Re-verify payload right before execution
    const check = state.validate(state.selectedOrder, newStatus);
    if (!check.allowed) {
      notificationStore.showNotification(check.error, "error");
      return false;
    }

    set({ isUpdating: true });
    
    try {
      // ✨ QA FIX: Pass the new Cash metrics down to the authoritative data layer
      await orderStore.updateOrderStatus(
        state.selectedOrder, 
        newStatus, 
        paymentMethod, 
        amountTendered
      );
      
      notificationStore.showNotification(`Order moved to ${formatStatus(newStatus)}`, "success");
      set({ selectedOrder: null }); // Force clear to close UI
      return true;
      
    } catch (error) {
      console.error("[TodayOrdersStore] Status Update Failed:", error.code || error.message);
      
      // Ensure error messages don't leak internal stack traces to the UI
      const errorMessage = (error && typeof error === 'object' && error.message)
        ? error.message.substring(0, 100) // Truncate excessively long backend errors
        : "System error: Could not sync status.";
        
      notificationStore.showNotification(`❌ ${errorMessage}`, "error");
      return false;
      
    } finally {
      // GUARANTEE: Reset lock state regardless of Promise resolution
      set({ isUpdating: false });
    }
  }
}));