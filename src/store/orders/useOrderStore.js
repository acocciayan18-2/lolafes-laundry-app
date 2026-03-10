import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, serverTimestamp, runTransaction, where, getDocs,
  increment 
} from 'firebase/firestore';

// --- CONFIGURATION ---
const STUCK_THRESHOLD_HOURS = 2; 
const UNCLAIMED_THRESHOLD_HOURS = 48; 
const VALID_STATUSES = ['pending', 'in_progress', 'ready', 'completed', 'picked_up', 'delivered', 'cancelled'];
const VALID_HANDOVERS = ['pickup', 'delivery'];
const VALID_PAYMENT_METHODS = ['Cash', 'GCash']; // Define valid methods

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
    // Prevent database bloating / abuse via massive text payloads
    return reason.trim().substring(0, 500); 
  }

  static async executeCancellation(orderId, reason, localOrderState, isLockedCheck) {
    if (!orderId || typeof orderId !== 'string') throw new ValidationError("Invalid order identifier.");
    if (!localOrderState?.customer_id) throw new ValidationError("Order is missing customer association.");
    if (isLockedCheck(localOrderState)) throw new ValidationError("Order is finalized and locked.");

    const safeReason = this.#sanitizeReason(reason);
    const orderRef = doc(db, "orders", orderId);
    const archiveRef = doc(db, "cancelled_orders", orderId);
    const customerRef = doc(db, "customers", localOrderState.customer_id);

    try {
      let rewardLogDocRefs = [];
      const rewardLogQuery = query(
        collection(db, "reward_logs"), 
        where("order_number", "==", localOrderState.order_number)
      );
      const rewardLogSnap = await getDocs(rewardLogQuery);
      rewardLogSnap.forEach(doc => rewardLogDocRefs.push(doc.ref));

      await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        const custSnap = await transaction.get(customerRef);

        if (!orderSnap.exists()) throw new Error("Order record missing on server.");
        if (!custSnap.exists()) throw new Error("Customer record missing.");

        const dbOrderData = orderSnap.data();
        const currentBalance = Number(custSnap.data().loyalty_points) || 0;
        
        const pointsSpentOnReward = Number(dbOrderData.loyalty_points_to_deduct) || 0;
        let pointsAdjustment = pointsSpentOnReward > 0 ? pointsSpentOnReward : -1;
        const newBalance = Math.max(0, currentBalance + pointsAdjustment);

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

        const customerUpdates = { order_count: increment(-1) };
        if (currentBalance !== newBalance) {
          customerUpdates.loyalty_points = newBalance;
        }

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
// 🛠️ UTILITIES
// ==========================================
const safeStorageGet = (key, fallback) => {
  try { return localStorage.getItem(key) ?? fallback; } catch (e) { return fallback; }
};

const formatVelocity = (ms) => {
  if (!ms || ms <= 0 || isNaN(ms)) return "0 secs";
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

  parseTimestamp: (ts) => {
    if (!ts) return null;
    try {
      let dateObj;
      if (typeof ts === 'string') dateObj = new Date(ts);
      else if (typeof ts === 'number') dateObj = new Date(ts);
      else if (ts.seconds) dateObj = new Date(ts.seconds * 1000);
      else if (typeof ts.toDate === 'function') dateObj = ts.toDate();
      else dateObj = new Date(ts);
      return isNaN(dateObj.getTime()) ? null : dateObj;
    } catch (e) { return null; }
  },

  isOrderStuck: (order) => {
    if (!order || !order.updated_at) return false;
    if (['picked_up', 'delivered', 'completed', 'cancelled'].includes(order.status)) return false;
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
    
    return onSnapshot(qOrders, 
      (snapshot) => {
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
          const totalAmount = Math.max(0, Number(data.total_amount) || 0); // Guard against negatives

          const order = {
            id: docSnap.id, ...data,
            created_date: new Date(createdDateMs).toISOString(),
            updated_at: data.updated_at ? new Date(updatedDateMs).toISOString() : null,
            picked_up_at: data.picked_up_at ? new Date(get().parseTimestamp(data.picked_up_at).getTime()).toISOString() : null,
            completed_at: data.completed_at ? new Date(get().parseTimestamp(data.completed_at).getTime()).toISOString() : null,
          };
          ordersList.push(order);

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
      },
      (error) => {
        console.error("Orders Subscription Error:", error);
        set({ isLoading: false });
      }
    );
  },

  subscribeToCancelledOrders: () => {
    const q = query(collection(db, "cancelled_orders"), orderBy("cancelled_at", "desc"));
    return onSnapshot(q, 
      (snapshot) => {
        const list = snapshot.docs.map(docSnap => ({
          id: docSnap.id, ...docSnap.data(),
          cancelled_at_date: get().parseTimestamp(docSnap.data().cancelled_at)
        }));
        set({ cancelledOrders: list });
      },
      (error) => console.error("Cancelled Orders Subscription Error:", error)
    );
  },

  subscribeToRewards: () => {
    const q = query(collection(db, "reward_logs"), orderBy("timestamp", "desc"));
    return onSnapshot(q, 
      (snapshot) => {
        const list = snapshot.docs.map(docSnap => ({
          id: docSnap.id, ...docSnap.data(),
          date: get().parseTimestamp(docSnap.data().timestamp)
        }));
        set({ rewardLogs: list });
      },
      (error) => console.error("Rewards Subscription Error:", error)
    );
  },

  // --- ✍️ MUTATIONS ---
  updateOrderStatus: async (order, newStatus, paymentMethod = null) => {
    if (!order || !order.id) throw new ValidationError("Invalid order object.");
    if (!VALID_STATUSES.includes(newStatus)) throw new ValidationError(`Invalid status: ${newStatus}`);
    if (get().isOrderLocked(order)) throw new ValidationError("Order is locked.");
    
    const isHandover = ['picked_up', 'delivered'].includes(newStatus);
    
    // ✨ SECURITY: If it's a handover, ensure it's either already paid OR a payment method is provided
    if (isHandover && !order.is_paid && !paymentMethod) {
      throw new ValidationError("Payment Required: Handover restricted.");
    }

    const updateData = { status: newStatus, updated_at: serverTimestamp() };

    if (newStatus === 'completed') updateData.completed_at = serverTimestamp();
    
    if (isHandover) {
      updateData.is_paid = true; 
      
      // ✨ STRONGER GUARD: Prioritize the explicit paymentMethod if passed, otherwise keep the existing one. 
      // If neither exists (edge case), default to Cash.
      const sanitizedMethod = VALID_PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'Cash';
      updateData.payment_method = paymentMethod ? sanitizedMethod : (order.payment_method || 'Cash');
      
      if (newStatus === 'picked_up') updateData.picked_up_at = serverTimestamp();
      if (newStatus === 'delivered') updateData.delivered_at = serverTimestamp();
    }
    
    await updateDoc(doc(db, "orders", order.id), updateData);
  },

  cancelOrder: async (orderId, reason) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) throw new ValidationError("Order not found.");

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
    if (!orderId) throw new ValidationError("Missing order identifier.");
    
    // Sanitize to prevent malicious injection / DB bloat
    const sanitizedNotes = typeof newNotes === 'string' ? newNotes.trim().substring(0, 1000) : "";
    
    await updateDoc(doc(db, "orders", orderId), { 
      notes: sanitizedNotes, 
      updated_at: serverTimestamp() 
    });
  },

  togglePaymentStatus: async (orderId, targetStatus, method = 'Cash') => {
    if (!orderId) throw new ValidationError("Missing order identifier.");
    
    const order = get().orders.find(o => o.id === orderId);
    if (!order) throw new ValidationError("Order not found.");
    if (get().isOrderLocked(order)) throw new ValidationError("Order is locked.");
    
    // Convert to strict boolean
    const safeTargetStatus = Boolean(targetStatus);
    
    if (order.is_paid && !safeTargetStatus) {
      throw new ValidationError("Payment cannot be reversed once an order is marked as Paid.");
    }
    
    // ✨ VALIDATION: Ensure the method is allowed
    const safeMethod = VALID_PAYMENT_METHODS.includes(method) ? method : 'Cash';

    await updateDoc(doc(db, "orders", orderId), { 
      is_paid: safeTargetStatus, 
      payment_method: safeTargetStatus ? safeMethod : order.payment_method, 
      updated_at: serverTimestamp() 
    });
  },

  toggleAutoPrint: () => {
    const newValue = !get().settings.autoPrint;
    set((state) => ({ settings: { ...state.settings, autoPrint: newValue } }));
    try { localStorage.setItem('autoPrint', newValue); } catch(e) { /* Ignore quota errors */ }
  },

  updateHandoverMethod: async (orderId, newMethod, newFee, newTotal) => {
    if (!orderId) throw new ValidationError("Missing order identifier.");
    if (!VALID_HANDOVERS.includes(newMethod)) throw new ValidationError("Invalid handover method.");
    
    // Defensively parse floats and prevent negative calculations
    const safeFee = Math.max(0, Number(newFee) || 0);
    const safeTotal = Math.max(0, Number(newTotal) || 0);

    await updateDoc(doc(db, "orders", orderId), { 
      handover_method: newMethod, 
      delivery_fee: safeFee, 
      total_amount: safeTotal, 
      updated_at: serverTimestamp() 
    });
  }
}));