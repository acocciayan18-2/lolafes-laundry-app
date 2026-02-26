import { create } from 'zustand';
import { useOrderStore } from './useOrderStore';
import { useNotificationStore } from '../ui/useNotificationStore';

export const useTodayOrdersStore = create((set, get) => ({
  selectedOrder: null,
  isUpdating: false,

  setSelectedOrder: (order) => set({ selectedOrder: order }),

  /**
   * Internal Validator: Checks all business logic scenarios
   */
  validate: (order, newStatus) => {
    if (!order) return { allowed: false, error: "No order selected." };

    // 1. Same Status Check
    if (order.status === newStatus) {
      return { allowed: false, error: "Order is already in this status." };
    }

    // 2. 5-Minute Time Lock (Global Rule)
    if (order.status === 'picked_up' && order.picked_up_at) {
      const pickedUpTime = new Date(order.picked_up_at).getTime();
      const FIVE_MIN_MS = 5 * 60 * 1000;
      if (Date.now() - pickedUpTime > FIVE_MIN_MS) {
        return { allowed: false, error: "Finalized: Picked up orders lock after 5 mins." };
      }
    }

    // 3. Payment Requirement
    if (newStatus === 'picked_up' && !order.is_paid) {
      return { allowed: false, error: "Payment required before marking as Picked Up." };
    }

    return { allowed: true };
  },

  executeStatusUpdate: async (newStatus) => {
    const { selectedOrder, validate } = get();
    const { updateOrderStatus } = useOrderStore.getState();
    const { showNotification } = useNotificationStore.getState();

    const check = validate(selectedOrder, newStatus);
    if (!check.allowed) {
      showNotification(check.error, "error");
      return;
    }

    set({ isUpdating: true });
    try {
      await updateOrderStatus(selectedOrder, newStatus);
      showNotification(`Order moved to ${newStatus.replace('_', ' ')}`, "success");
      set({ selectedOrder: null });
    } catch (error) {
      showNotification("Update failed. Check connection!", "error");
    } finally {
      set({ isUpdating: false });
    }
  }
}));