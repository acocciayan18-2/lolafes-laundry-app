import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, serverTimestamp, getDoc, setDoc, deleteDoc 
} from 'firebase/firestore';

// ==========================================
// HELPER: SAFE LOCAL STORAGE
// Prevents app crashes in Incognito/Strict Privacy modes
// ==========================================
const safeStorageGet = (key, fallback) => {
  try { return localStorage.getItem(key) ?? fallback; } 
  catch (e) { return fallback; }
};
const safeStorageSet = (key, val) => {
  try { localStorage.setItem(key, val); } 
  catch (e) { console.warn("Local storage disabled."); }
};

// ==========================================
// HELPER: DYNAMIC TIME FORMATTER
// ==========================================
const formatVelocity = (ms) => {
  if (!ms || ms <= 0) return "0 secs";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes} mins`;
  return `${seconds} secs`;
};

export const useOrderStore = create((set, get) => ({
  orders: [],
  metrics: {
    salesToday: 0, 
    salesYesterdayTotal: 0, 
    ordersTodayCount: 0,
    ordersYesterdayTotalCount: 0, 
    revenueAtRisk: 0, 
    staleOrders: [],
    avgVelocity: "0 secs", 
    topService: 'N/A',
  },
  isLoading: true,

  settings: {
    autoPrint: safeStorageGet('autoPrint') === 'true',
    defaultPrinter: safeStorageGet('defaultPrinter', 'browser'), 
  },

  setDefaultPrinter: (type) => {
    safeStorageSet('defaultPrinter', type);
    set((state) => ({ settings: { ...state.settings, defaultPrinter: type } }));
  },

  toggleAutoPrint: () => {
    const newState = !get().settings.autoPrint;
    safeStorageSet('autoPrint', String(newState));
    set((state) => ({ settings: { ...state.settings, autoPrint: newState } }));
  },

  // ==========================================
  // ROBUST TIME PARSING & LOCK CHECKS
  // ==========================================
  parseTimestamp: (ts) => {
    if (!ts) return null;
    try {
      let dateObj;
      if (typeof ts === 'string') dateObj = new Date(ts);
      else if (ts.seconds) dateObj = new Date(ts.seconds * 1000);
      else if (typeof ts.toDate === 'function') dateObj = ts.toDate();
      else dateObj = new Date(ts);
      
      return isNaN(dateObj.getTime()) ? null : dateObj;
    } catch (e) {
      return null;
    }
  },

  isOrderStuck: (order) => {
    if (!order || !order.updated_at || ['picked_up', 'delivered'].includes(order.status)) return false;
    const lastUpdate = get().parseTimestamp(order.updated_at);
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate.getTime()) > (48 * 60 * 60 * 1000); 
  },

  isOrderLocked: (order) => {
    if (!order || !order.updated_at) return false;
    const isTerminalStatus = ['picked_up', 'delivered'].includes(order.status);
    if (!isTerminalStatus) return false;
    
    const completionTime = get().parseTimestamp(order.updated_at);
    if (!completionTime) return false;
    return (Date.now() - completionTime.getTime()) > (10 * 60 * 1000);
  },

  // ==========================================
  // FIREBASE SUBSCRIPTION (HIGH PERFORMANCE)
  // ==========================================
  subscribeToOrders: () => {
    set({ isLoading: true });
    
    const qOrders = query(collection(db, "orders"), orderBy("created_at", "desc"));
    
    return onSnapshot(qOrders, (snapshot) => {
      // 1. Midnight Bug Fix: Recalculate "Now" inside the snapshot callback
      const now = new Date();
      const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterdayMs = startOfTodayMs - 86400000;

      // 2. Metrics Accumulators (Single-Pass Performance)
      let salesToday = 0;
      let salesYesterdayTotal = 0;
      let ordersTodayCount = 0;
      let ordersYesterdayTotalCount = 0;
      let revenueAtRisk = 0;
      let totalVelocityMS = 0;
      let finishedCount = 0;
      const staleOrders = [];
      const ordersList = [];

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const createdDateMs = get().parseTimestamp(data.created_at)?.getTime() || Date.now();
        const updatedDateMs = get().parseTimestamp(data.updated_at)?.getTime() || createdDateMs;
        const totalAmount = Number(data.total_amount) || 0;

        // Build sanitized order object
        const order = {
          id: docSnap.id,
          ...data,
          created_date: new Date(createdDateMs).toISOString(),
          updated_at: data.updated_at ? new Date(updatedDateMs).toISOString() : null,
          picked_up_at: data.picked_up_at ? new Date(get().parseTimestamp(data.picked_up_at).getTime()).toISOString() : null,
        };
        ordersList.push(order);

        // --- SINGLE PASS METRICS CALCULATOR ---
        const isPaid = order.is_paid;
        
        // Sales & Order Counts
        if (createdDateMs >= startOfTodayMs) {
          ordersTodayCount++;
          if (isPaid) salesToday += totalAmount;
        } else if (createdDateMs >= startOfYesterdayMs && createdDateMs < startOfTodayMs) {
          ordersYesterdayTotalCount++;
          if (isPaid) salesYesterdayTotal += totalAmount;
        }

        // Revenue at Risk
        if (!isPaid) revenueAtRisk += totalAmount;

        // Stale Orders
        const isTerminal = ['picked_up', 'completed', 'delivered'].includes(order.status);
        if (!isTerminal && (Date.now() - updatedDateMs) > (48 * 60 * 60 * 1000)) {
          staleOrders.push(order);
        }

        // Velocity (Speed)
        if (['ready', 'completed', 'picked_up', 'delivered'].includes(order.status) && data.updated_at) {
          totalVelocityMS += Math.max(0, updatedDateMs - createdDateMs);
          finishedCount++;
        }
      });

      set({ 
        orders: ordersList, 
        isLoading: false,
        metrics: {
          salesToday, 
          salesYesterdayTotal,
          ordersTodayCount,
          ordersYesterdayTotalCount,
          revenueAtRisk, 
          staleOrders, 
          topService: 'N/A', 
          avgVelocity: formatVelocity(finishedCount > 0 ? totalVelocityMS / finishedCount : 0),
        }
      });
    }, (error) => {
      console.error("Firebase Subscription Error:", error);
      set({ isLoading: false });
    });
  },

  // ==========================================
  // SECURE MUTATION ACTIONS
  // ==========================================
  togglePaymentStatus: async (orderId, targetStatus, method = 'Cash') => {
    const order = get().orders.find(o => o.id === orderId);
    if (get().isOrderLocked(order)) throw new Error("Order is locked.");

    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      is_paid: targetStatus,
      payment_method: targetStatus ? method : "Unpaid",
      updated_at: serverTimestamp()
    });
  },

  updateOrderStatus: async (order, newStatus) => {
    if (get().isOrderLocked(order)) {
      throw new Error("This order is locked and cannot be modified.");
    }

    const orderRef = doc(db, "orders", order.id); 
    const updateData = { status: newStatus, updated_at: serverTimestamp() };

    // Auto-mark as paid and completed on terminal statuses
    if (newStatus === 'picked_up' || newStatus === 'delivered') { 
      updateData.is_paid = true; 
      updateData.completed_at = serverTimestamp();
      if (newStatus === 'picked_up') updateData.picked_up_at = serverTimestamp();
      if (newStatus === 'delivered') updateData.delivered_at = serverTimestamp();
    }

    await updateDoc(orderRef, updateData);
  },

  updateHandoverMethod: async (orderId, newMethod, newFee, newTotal) => {
    const order = get().orders.find(o => o.id === orderId);
    if (get().isOrderLocked(order)) throw new Error("Order is locked.");

    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { 
      handover_method: newMethod,
      delivery_fee: Number(newFee) || 0,
      total_amount: Number(newTotal) || 0,
      updated_at: serverTimestamp() 
    });
    return true;
  },

  cancelOrder: async (orderId) => {
    const order = get().orders.find(o => o.id === orderId);
    if (get().isOrderLocked(order)) throw new Error("Cannot cancel a completed order.");

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (orderSnap.exists()) {
      await setDoc(doc(db, "cancelled_orders", orderId), {
        ...orderSnap.data(),
        cancelled_at: serverTimestamp(),
        status: 'cancelled'
      });
      await deleteDoc(orderRef);
    }
  }
}));