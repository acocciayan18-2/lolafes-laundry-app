import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, serverTimestamp, runTransaction, where, getDocs,
  increment 
} from 'firebase/firestore';

const STUCK_THRESHOLD_HOURS = 2; 
const UNCLAIMED_THRESHOLD_HOURS = 48; 

// ==========================================
// 🛡️ OOP DATA LAYER: SECURE ERROR HANDLING
// ==========================================
class ValidationError extends Error { constructor(message) { super(message); this.name = "ValidationError"; } }
class DatabaseError extends Error { constructor(message) { super(message); this.name = "DatabaseError"; } }

// ==========================================
// ⚛️ OOP DATA LAYER: TRANSACTION SERVICE
// ==========================================
class OrderTransactionService {
  static #sanitizeReason(reason) {
    if (!reason || typeof reason !== 'string' || reason.trim() === "") {
      return "No reason specified";
    }
    return reason.trim().substring(0, 500); 
  }

  static async executeCancellation(orderId, reason, localOrderState, isLockedCheck) {
    if (!orderId) throw new ValidationError("Invalid order identifier.");
    if (isLockedCheck(localOrderState)) throw new ValidationError("Order is finalized and locked.");

    const safeReason = this.#sanitizeReason(reason);
    const orderRef = doc(db, "orders", orderId);
    const archiveRef = doc(db, "cancelled_orders", orderId);
    const customerRef = doc(db, "customers", localOrderState.customer_id);

    try {
      // 1. Pre-fetch related logs
      let rewardLogDocRefs = [];
      const rewardLogQuery = query(
        collection(db, "reward_logs"), 
        where("order_number", "==", localOrderState.order_number)
      );
      const rewardLogSnap = await getDocs(rewardLogQuery);
      rewardLogSnap.forEach(doc => rewardLogDocRefs.push(doc.ref));

      // 2. Run Atomic Transaction
      await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        const custSnap = await transaction.get(customerRef);

        if (!orderSnap.exists()) throw new Error("Order record missing on server.");
        if (!custSnap.exists()) throw new Error("Customer record missing.");

        const dbOrderData = orderSnap.data();
        const currentBalance = Number(custSnap.data().loyalty_points) || 0;
        
        // --- 🔄 REVERSAL LOGIC ---
        const pointsSpentOnReward = Number(dbOrderData.loyalty_points_to_deduct) || 0;
        let pointsAdjustment = 0;

        if (pointsSpentOnReward > 0) {
          // If they used points for a reward, give them back (+ points)
          pointsAdjustment = pointsSpentOnReward;
        } else {
          // If it was a regular paid order, remove the 1 point they earned (-1)
          pointsAdjustment = -1;
        }

        const newBalance = Math.max(0, currentBalance + pointsAdjustment);

        // 3. Batch DB Operations
        transaction.set(archiveRef, {
          ...dbOrderData,
          status: 'cancelled',
          cancelled_at: serverTimestamp(),
          cancellation_reason: safeReason,
          points_returned_to_customer: pointsSpentOnReward > 0 ? pointsSpentOnReward : 0,
          points_deducted_from_customer: pointsSpentOnReward === 0 ? 1 : 0
        });

        transaction.delete(orderRef);
        rewardLogDocRefs.forEach(ref => transaction.delete(ref));

        // Update Customer: Adjust Points AND Decrement Order Count
        const customerUpdates = { order_count: increment(-1) };
        if (currentBalance !== newBalance) {
          customerUpdates.loyalty_points = newBalance;
        }

        // ✨ NEW: Revert the rewards_claimed counter atomically
        if (rewardLogDocRefs.length > 0) {
          customerUpdates.rewards_claimed = increment(-rewardLogDocRefs.length);
        }

        transaction.update(customerRef, customerUpdates);
      });

      return true;
    } catch (error) {
      console.error("Cancellation Transaction Error:", error);
      throw new DatabaseError(error.message || "Failed to process cancellation.");
    }
  }
}

// ==========================================
// 🛠️ HELPERS
// ==========================================
const safeStorageGet = (key, fallback) => {
  try { return localStorage.getItem(key) ?? fallback; } catch (e) { return fallback; }
};

const formatVelocity = (ms) => {
  if (!ms || ms <= 0) return "0 secs";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes} mins`;
  return `${seconds} secs`;
};

// ==========================================
// 📦 THE STORE
// ==========================================
export const useOrderStore = create((set, get) => ({
  orders: [],
  cancelledOrders: [],
  rewardLogs: [],
  metrics: {
    salesToday: 0, salesYesterdayTotal: 0, ordersTodayCount: 0,
    ordersYesterdayTotalCount: 0, revenueAtRisk: 0, staleOrders: [],
    avgVelocity: "0 secs", topService: 'N/A',
  },
  isLoading: true,
  settings: {
    autoPrint: safeStorageGet('autoPrint') === 'true',
    defaultPrinter: safeStorageGet('defaultPrinter', 'browser'), 
  },

  // --- TIME LOGIC ---
  parseTimestamp: (ts) => {
    if (!ts) return null;
    try {
      let dateObj;
      if (typeof ts === 'string') dateObj = new Date(ts);
      else if (ts.seconds) dateObj = new Date(ts.seconds * 1000);
      else if (typeof ts.toDate === 'function') dateObj = ts.toDate();
      else dateObj = new Date(ts);
      return isNaN(dateObj.getTime()) ? null : dateObj;
    } catch (e) { return null; }
  },

  isOrderStuck: (order) => {
    if (!order || !order.updated_at) return false;
    if (['picked_up', 'delivered', 'completed'].includes(order.status)) return false;
    const lastUpdate = get().parseTimestamp(order.updated_at);
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60) > STUCK_THRESHOLD_HOURS;
  },

  isOrderUnclaimed: (order) => {
    if (!order || order.status !== 'completed') return false;
    const anchorTime = order.completed_at || order.updated_at;
    const completedTime = get().parseTimestamp(anchorTime);
    if (!completedTime) return false;
    return (Date.now() - completedTime.getTime()) / (1000 * 60 * 60) > UNCLAIMED_THRESHOLD_HOURS;
  },

  isOrderLocked: (order) => {
    if (!order || !order.updated_at) return false;
    if (!['picked_up', 'delivered'].includes(order.status)) return false;
    const completionTime = get().parseTimestamp(order.updated_at);
    return completionTime && (Date.now() - completionTime.getTime()) > (5 * 60 * 1000);
  },

  // --- 📡 SUBSCRIPTIONS ---
  subscribeToOrders: () => {
    set({ isLoading: true });
    const qOrders = query(collection(db, "orders"), orderBy("created_at", "desc"));
    return onSnapshot(qOrders, (snapshot) => {
      const now = new Date();
      const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterdayMs = startOfTodayMs - 86400000;

      let salesToday = 0, salesYesterdayTotal = 0, ordersTodayCount = 0;
      let ordersYesterdayTotalCount = 0, revenueAtRisk = 0, totalVelocityMS = 0, finishedCount = 0;
      const staleOrders = [], ordersList = [];

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const createdDateMs = get().parseTimestamp(data.created_at)?.getTime() || Date.now();
        const updatedDateMs = get().parseTimestamp(data.updated_at)?.getTime() || createdDateMs;
        const totalAmount = Number(data.total_amount) || 0;

        const order = {
          id: docSnap.id, ...data,
          created_date: new Date(createdDateMs).toISOString(),
          updated_at: data.updated_at ? new Date(updatedDateMs).toISOString() : null,
          picked_up_at: data.picked_up_at ? new Date(get().parseTimestamp(data.picked_up_at).getTime()).toISOString() : null,
          completed_at: data.completed_at ? new Date(get().parseTimestamp(data.completed_at).getTime()).toISOString() : null,
        };
        ordersList.push(order);

        // Calculate Metrics
        if (createdDateMs >= startOfTodayMs) { 
          ordersTodayCount++; 
          if (order.is_paid) salesToday += totalAmount; 
        } 
        else if (createdDateMs >= startOfYesterdayMs) { 
          ordersYesterdayTotalCount++; 
          if (order.is_paid) salesYesterdayTotal += totalAmount; 
        }

        if (!order.is_paid) revenueAtRisk += totalAmount;
        if (get().isOrderStuck(order) || get().isOrderUnclaimed(order)) staleOrders.push(order);
        
        if (['ready', 'completed', 'picked_up', 'delivered'].includes(order.status) && data.updated_at) {
          totalVelocityMS += Math.max(0, updatedDateMs - createdDateMs);
          finishedCount++;
        }
      });

      set({ 
        orders: ordersList, 
        isLoading: false, 
        metrics: { 
          salesToday, salesYesterdayTotal, ordersTodayCount, 
          ordersYesterdayTotalCount, revenueAtRisk, staleOrders, 
          topService: 'N/A', 
          avgVelocity: formatVelocity(finishedCount > 0 ? totalVelocityMS / finishedCount : 0) 
        } 
      });
    });
  },

  subscribeToCancelledOrders: () => {
    const q = query(collection(db, "cancelled_orders"), orderBy("cancelled_at", "desc"));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id, ...data,
          cancelled_at_date: get().parseTimestamp(data.cancelled_at)
        };
      });
      set({ cancelledOrders: list });
    });
  },

  subscribeToRewards: () => {
    const q = query(collection(db, "reward_logs"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id, ...docSnap.data(),
        date: get().parseTimestamp(docSnap.data().timestamp)
      }));
      set({ rewardLogs: list });
    });
  },

  // --- ✍️ MUTATIONS ---
  updateOrderStatus: async (order, newStatus) => {
    if (get().isOrderLocked(order)) throw new Error("Order is locked.");
    const isHandover = ['picked_up', 'delivered'].includes(newStatus);
    if (isHandover && !order.is_paid) throw new Error("Payment Required: Handover restricted.");

    const orderRef = doc(db, "orders", order.id); 
    const updateData = { status: newStatus, updated_at: serverTimestamp() };

    if (newStatus === 'completed') updateData.completed_at = serverTimestamp();
    if (isHandover) {
      updateData.is_paid = true; 
      if (!order.payment_method) updateData.payment_method = 'Cash';
      if (newStatus === 'picked_up') updateData.picked_up_at = serverTimestamp();
      if (newStatus === 'delivered') updateData.delivered_at = serverTimestamp();
    }
    await updateDoc(orderRef, updateData);
  },

  cancelOrder: async (orderId, reason) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) throw new Error("Order not found.");

    try {
      await OrderTransactionService.executeCancellation(
        orderId, reason, order, get().isOrderLocked
      );
      return true;
    } catch (error) {
      throw new Error(error.message || "Cancellation failed.");
    }
  },

  updateOrderNotes: async (orderId, newNotes) => {
    await updateDoc(doc(db, "orders", orderId), { 
      notes: newNotes, updated_at: serverTimestamp() 
    });
  },

  togglePaymentStatus: async (orderId, targetStatus, method = 'Cash') => {
  const order = get().orders.find(o => o.id === orderId);
  if (!order) throw new Error("Order not found.");
  if (get().isOrderLocked(order)) throw new Error("Order is locked.");
  
  // ✨ GUARD: Strictly prevent turning a Paid order back to Unpaid
  if (order.is_paid && targetStatus === false) {
    throw new Error("Payment cannot be reversed once an order is marked as Paid.");
  }

  await updateDoc(doc(db, "orders", orderId), { 
    is_paid: targetStatus, 
    payment_method: targetStatus ? method : order.payment_method, 
    updated_at: serverTimestamp() 
  });
},
  toggleAutoPrint: () => {
    const newValue = !get().settings.autoPrint;
    set((state) => ({ settings: { ...state.settings, autoPrint: newValue } }));
    localStorage.setItem('autoPrint', newValue);
  },

  updateHandoverMethod: async (orderId, newMethod, newFee, newTotal) => {
    await updateDoc(doc(db, "orders", orderId), { 
      handover_method: newMethod, 
      delivery_fee: Number(newFee) || 0, 
      total_amount: Number(newTotal) || 0, 
      updated_at: serverTimestamp() 
    });
  }
}));