import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  serverTimestamp, runTransaction, where, getDocs,
  increment, updateDoc
} from 'firebase/firestore';


const CONFIG = Object.freeze({
  STUCK_THRESHOLD_HOURS: 2,
  UNCLAIMED_THRESHOLD_HOURS: 48,
  LOCK_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
});

const VALID_STATUSES = Object.freeze(['pending', 'in_progress', 'ready', 'completed', 'picked_up', 'delivered', 'cancelled']);
const VALID_HANDOVERS = Object.freeze(['pickup', 'delivery']);
const TERMINAL_STATUSES = Object.freeze(['picked_up', 'delivered', 'cancelled']);

// ==========================================
// 🛡️ OOP DATA LAYER: SECURE ERROR HANDLING
// ==========================================
class ValidationError extends Error { 
  constructor(message) { super(message); this.name = "ValidationError"; } 
}
class DatabaseError extends Error { 
  constructor(message) { super(message); this.name = "DatabaseError"; } 
}

// ==========================================
// ⚛️ OOP DATA LAYER: TRANSACTION SERVICE
// ==========================================
class OrderTransactionService {
  static #sanitizeReason(reason) {
    if (!reason || typeof reason !== 'string' || reason.trim() === "") {
      return "No reason specified";
    }
    // Strip angle brackets to mitigate basic XSS payloads, truncate to 500 chars
    return reason.replace(/[<>]/g, '').trim().substring(0, 500); 
  }

  static async executeCancellation(orderId, reason, localOrderState, isLockedCheck) {
    if (!orderId || typeof orderId !== 'string') throw new ValidationError("Invalid order identifier.");
    
    // Allow null customer_id ONLY IF the order is an anonymous Walk-In
    if (!localOrderState?.is_walk_in && !localOrderState?.customer_id) {
      throw new ValidationError("Order is missing customer association.");
    }
    
    if (isLockedCheck(localOrderState)) throw new ValidationError("Action Denied: Order is finalized and locked.");

    const safeReason = this.#sanitizeReason(reason);
    const orderRef = doc(db, "orders", orderId);
    const archiveRef = doc(db, "cancelled_orders", orderId);

    try {
      let rewardLogDocRefs = [];
      
      // Only query for used rewards if the customer is NOT anonymous
      if (!localOrderState?.is_walk_in && localOrderState?.order_number) {
        const rewardLogQuery = query(
          collection(db, "reward_logs"), 
          where("order_number", "==", localOrderState.order_number)
        );
        const rewardLogSnap = await getDocs(rewardLogQuery);
        rewardLogSnap.forEach(docSnap => rewardLogDocRefs.push(docSnap.ref));
      }

      await runTransaction(db, async (transaction) => {
        // ==========================================
        // PHASE 1: ALL READS FIRST
        // ==========================================
        
        // Read Order
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order record missing on server. It may have already been deleted.");
        
        const dbOrderData = orderSnap.data();
        
        if (TERMINAL_STATUSES.includes(dbOrderData.status)) {
          throw new Error("Order has already been processed and cannot be cancelled.");
        }

        // ✨ THE FIX: Read Customer data BEFORE we write anything!
        let custSnap = null;
        let customerRef = null;
        
        if (!dbOrderData.is_walk_in && localOrderState.customer_id) {
          customerRef = doc(db, "customers", localOrderState.customer_id);
          custSnap = await transaction.get(customerRef);
        }

        // ==========================================
        // PHASE 2: ALL WRITES
        // ==========================================
        
        const pointsSpentOnReward = Math.max(0, Number(dbOrderData.loyalty_points_to_deduct) || 0);

        // Write to Archive
        transaction.set(archiveRef, {
          ...dbOrderData,
          status: 'cancelled',
          cancelled_at: serverTimestamp(),
          cancellation_reason: safeReason,
          points_returned_to_customer: pointsSpentOnReward > 0 ? pointsSpentOnReward : 0,
          points_deducted_from_customer: (pointsSpentOnReward === 0 && !dbOrderData.is_walk_in) ? 1 : 0
        });

        // Delete Original Order
        transaction.delete(orderRef);

        // Update Customer Loyalty & Stats
        if (custSnap && custSnap.exists() && customerRef) {
          const currentBalance = Math.max(0, Number(custSnap.data().loyalty_points) || 0);
          let pointsAdjustment = pointsSpentOnReward > 0 ? pointsSpentOnReward : -1;
          const newBalance = Math.max(0, currentBalance + pointsAdjustment);

          const customerUpdates = { order_count: increment(-1) };
          if (currentBalance !== newBalance) {
            customerUpdates.loyalty_points = newBalance;
          }
          if (rewardLogDocRefs.length > 0) {
            customerUpdates.rewards_claimed = increment(-rewardLogDocRefs.length);
          }

          transaction.update(customerRef, customerUpdates);
        }
        
        // Delete associated reward logs (if any)
        if (!dbOrderData.is_walk_in) {
          rewardLogDocRefs.forEach(ref => transaction.delete(ref));
        }
      });

      return true;
    } catch (error) {
      console.error("[TransactionService] Cancellation Error:", error);
      throw new DatabaseError(error.message || "Database transaction failed to process cancellation.");
    }
  }
}

// ==========================================
// 🛠️ UTILITIES
// ==========================================
const safeStorageGet = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try { 
    return localStorage.getItem(key) ?? fallback; 
  } catch (e) { 
    return fallback; 
  }
};

const parseMoney = (val) => {
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
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
  // --- STATE ---
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
  
  // Track active subscriptions to prevent memory leaks
  _unsubOrders: null,
  _unsubCancelled: null,
  _unsubRewards: null,

  // --- DERIVED LOGIC / SELECTORS ---
  
  parseTimestamp: (ts) => {
    if (!ts) return null;
    try {
      if (typeof ts.toDate === 'function') return ts.toDate();
      if (ts.seconds) return new Date(ts.seconds * 1000);
      const parsed = new Date(ts);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (e) { return null; }
  },

  isOrderStuck: (order) => {
    if (!order || !order.updated_at) return false;
    if (TERMINAL_STATUSES.includes(order.status) || order.status === 'completed') return false;
    
    const lastUpdate = get().parseTimestamp(order.updated_at);
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60) > CONFIG.STUCK_THRESHOLD_HOURS;
  },

isOrderUnclaimed: (order) => {
  // 🛡️ DEFENSIVE GUARD: Strict state validation
  if (!order || order.status !== 'completed') return false;

  // 🔒 ARCHITECTURE: We prioritize 'completed_at'. 
  // Falling back to 'updated_at' only if the completion timestamp is missing.
  const anchorTime = order.completed_at || order.updated_at;
  const completedTime = get().parseTimestamp(anchorTime);

  if (!completedTime) return false;

  const now = Date.now();
  const completionMs = completedTime.getTime();

  if (completionMs > now) return false;

  const elapsedHours = (now - completionMs) / (1000 * 60 * 60);
  
  return elapsedHours > CONFIG.UNCLAIMED_THRESHOLD_HOURS;
},
  isOrderLocked: (order) => {
    if (!order || !order.updated_at) return false;
    if (!['picked_up', 'delivered'].includes(order.status)) return false;
    
    const completionTime = get().parseTimestamp(order.updated_at);
    return completionTime && (Date.now() - completionTime.getTime()) > CONFIG.LOCK_WINDOW_MS;
  },

  // --- 📡 SUBSCRIPTIONS (READS) ---
  
  subscribeToOrders: () => {
    // Prevent duplicate listeners
    const currentUnsub = get()._unsubOrders;
    if (currentUnsub) currentUnsub();

    set({ isLoading: true });
    const qOrders = query(collection(db, "orders"), orderBy("created_at", "desc"));
    
    const unsubscribe = onSnapshot(qOrders, 
      (snapshot) => {
        // Cache Date.now() ONCE per snapshot to ensure mathematical consistency
        const CURRENT_TIME_MS = Date.now();
        const now = new Date(CURRENT_TIME_MS);
        const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterdayMs = startOfTodayMs - 86400000;

        let salesToday = 0, salesYesterdayTotal = 0, ordersTodayCount = 0;
        let ordersYesterdayTotalCount = 0, revenueAtRisk = 0, totalVelocityMS = 0, finishedCount = 0;
        const staleOrders = [], ordersList = [];

        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (!data) return; // Guard against corrupted docs

          // O(N) Fast Parse
          const createdDateMs = get().parseTimestamp(data.created_at)?.getTime() || CURRENT_TIME_MS;
          const updatedDateMs = get().parseTimestamp(data.updated_at)?.getTime() || createdDateMs;
          const totalAmount = parseMoney(data.total_amount);

          const order = {
            id: docSnap.id, 
            ...data,
            is_walk_in: Boolean(data.is_walk_in), // ✨ FIX: Explicitly parse walk-in state into memory
            created_date: new Date(createdDateMs).toISOString(),
            updated_at: data.updated_at ? new Date(updatedDateMs).toISOString() : null,
            picked_up_at: data.picked_up_at ? new Date(get().parseTimestamp(data.picked_up_at).getTime()).toISOString() : null,
            completed_at: data.completed_at ? new Date(get().parseTimestamp(data.completed_at).getTime()).toISOString() : null,
          };
          
          ordersList.push(order);

          // Fast Metrics Aggregation
          if (createdDateMs >= startOfTodayMs) { 
            ordersTodayCount++; 
            if (order.is_paid) salesToday = parseMoney(salesToday + totalAmount); 
          } 
          else if (createdDateMs >= startOfYesterdayMs) { 
            ordersYesterdayTotalCount++; 
            if (order.is_paid) salesYesterdayTotal = parseMoney(salesYesterdayTotal + totalAmount); 
          }

          if (!order.is_paid) revenueAtRisk = parseMoney(revenueAtRisk + totalAmount);
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
        console.error("[OrderStore] Orders Subscription Error:", error);
        set({ isLoading: false });
      }
    );

    set({ _unsubOrders: unsubscribe });
    return unsubscribe;
  },

  subscribeToCancelledOrders: () => {
    const currentUnsub = get()._unsubCancelled;
    if (currentUnsub) currentUnsub();

    const q = query(collection(db, "cancelled_orders"), orderBy("cancelled_at", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const list = [];
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data) {
            list.push({
              id: docSnap.id, 
              ...data,
              is_walk_in: Boolean(data.is_walk_in), // ✨ Inherit explicitly
              cancelled_at_date: get().parseTimestamp(data.cancelled_at)
            });
          }
        });
        set({ cancelledOrders: list });
      },
      (error) => console.error("[OrderStore] Cancelled Orders Sub Error:", error)
    );

    set({ _unsubCancelled: unsubscribe });
    return unsubscribe;
  },

  subscribeToRewards: () => {
    const currentUnsub = get()._unsubRewards;
    if (currentUnsub) currentUnsub();

    const q = query(collection(db, "reward_logs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const list = [];
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data) {
            list.push({
              id: docSnap.id, 
              ...data,
              date: get().parseTimestamp(data.timestamp)
            });
          }
        });
        set({ rewardLogs: list });
      },
      (error) => console.error("[OrderStore] Rewards Sub Error:", error)
    );

    set({ _unsubRewards: unsubscribe });
    return unsubscribe;
  },
  
  updateOrderStatus: async (order, newStatus, paymentMethod = null, amountTendered = null) => {
    if (!order || !order.id) throw new ValidationError("Invalid order object structure.");
    if (!VALID_STATUSES.includes(newStatus)) throw new ValidationError(`Invalid status transition requested: ${newStatus}`);
    if (get().isOrderLocked(order)) throw new ValidationError("Action Denied: Order is finalized and securely locked.");
    
    const isHandover = ['picked_up', 'delivered'].includes(newStatus);
    
    if (isHandover && !order.is_paid && !paymentMethod) {
      throw new ValidationError("Payment Required: Handover restricted for unpaid orders.");
    }

    const updateData = { 
      status: newStatus, 
      updated_at: serverTimestamp() 
    };

    if (newStatus === 'completed') {
      updateData.completed_at = serverTimestamp();
    }
    
    if (isHandover) {
      updateData.is_paid = true; 
      
      const isCash = paymentMethod && String(paymentMethod).toLowerCase().includes('cash');
      const safeAmountTendered = amountTendered ? parseMoney(amountTendered) : order.total_amount;

      // Smart Cash Handling Sync
      if (paymentMethod) {
        updateData.payment_method = String(paymentMethod).substring(0, 50); 
        updateData.amount_tendered = isCash ? safeAmountTendered : order.total_amount;
        updateData.change_due = isCash ? Math.max(0, parseMoney(safeAmountTendered - order.total_amount)) : 0;
      } else {
        updateData.payment_method = order.payment_method || 'Cash';
      }
      
      if (newStatus === 'picked_up') updateData.picked_up_at = serverTimestamp();
      if (newStatus === 'delivered') updateData.delivered_at = serverTimestamp();
    }
    
    await updateDoc(doc(db, "orders", order.id), updateData);
  },

  cancelOrder: async (orderId, reason) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) throw new ValidationError("System Error: Order mapping lost.");

    try {
      await OrderTransactionService.executeCancellation(
        orderId, reason, order, get().isOrderLocked
      );
      return true;
    } catch (error) {
      throw new Error(error.message || "Cancellation transaction failed.");
    }
  },

  updateOrderNotes: async (orderId, newNotes) => {
    if (!orderId) throw new ValidationError("Missing order identifier.");
    
    // SECURITY: Sanitize to prevent malicious injection / NoSQL DB bloat
    const sanitizedNotes = typeof newNotes === 'string' ? newNotes.replace(/[<>]/g, '').trim().substring(0, 1000) : "";
    
    await updateDoc(doc(db, "orders", orderId), { 
      notes: sanitizedNotes, 
      updated_at: serverTimestamp() 
    });
  },

  togglePaymentStatus: async (orderId, targetStatus, method = 'Cash', amountTendered = null) => {
    if (!orderId) throw new ValidationError("Missing order identifier.");
    
    const order = get().orders.find(o => o.id === orderId);
    if (!order) throw new ValidationError("Order mapping lost.");
    if (get().isOrderLocked(order)) throw new ValidationError("Action Denied: Order is locked.");
    
    const safeTargetStatus = Boolean(targetStatus);
    
    if (order.is_paid && !safeTargetStatus) {
      throw new ValidationError("Fraud Prevention: Payment cannot be reversed once an order is marked as Paid.");
    }
    
    const safeMethod = String(method).substring(0, 50);
    const isCash = safeMethod.toLowerCase().includes('cash');
    const safeAmountTendered = amountTendered ? parseMoney(amountTendered) : order.total_amount;

    await updateDoc(doc(db, "orders", orderId), { 
      is_paid: safeTargetStatus, 
      payment_method: safeTargetStatus ? safeMethod : order.payment_method, 
      amount_tendered: safeTargetStatus ? (isCash ? safeAmountTendered : order.total_amount) : 0,
      change_due: safeTargetStatus ? (isCash ? Math.max(0, parseMoney(safeAmountTendered - order.total_amount)) : 0) : 0,
      updated_at: serverTimestamp() 
    });
  },

  updateHandoverMethod: async (orderId, newMethod, newFee, newTotal) => {
    if (!orderId) throw new ValidationError("Missing order identifier.");
    if (!VALID_HANDOVERS.includes(newMethod)) throw new ValidationError("Invalid handover method requested.");
    
    const safeFee = Math.max(0, parseMoney(newFee));
    const safeTotal = Math.max(0, parseMoney(newTotal));

    const order = get().orders.find(o => o.id === orderId);

    const updatePayload = { 
      handover_method: newMethod, 
      delivery_fee: safeFee, 
      total_amount: safeTotal, 
      updated_at: serverTimestamp() 
    };

    if (order?.is_paid && order?.payment_method?.toLowerCase().includes('cash')) {
        const tendered = parseMoney(order.amount_tendered || 0);
        updatePayload.change_due = Math.max(0, parseMoney(tendered - safeTotal));
    }

    await updateDoc(doc(db, "orders", orderId), updatePayload);
  },

  toggleAutoPrint: () => {
    const newValue = !get().settings.autoPrint;
    set((state) => ({ settings: { ...state.settings, autoPrint: newValue } }));
    try { localStorage.setItem('autoPrint', newValue); } catch(e) { /* Ignore quota errors */ }
  }
}));