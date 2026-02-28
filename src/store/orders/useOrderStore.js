import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, serverTimestamp, getDoc, setDoc, deleteDoc 
} from 'firebase/firestore';

// --- HELPER: DYNAMIC TIME FORMATTER ---
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

  // --- NEW: AUTOMATION SETTINGS ---
 settings: {
    autoPrint: localStorage.getItem('autoPrint') === 'true',
    // CHANGE: Default to 'browser' for WPS/PDF support
    defaultPrinter: localStorage.getItem('defaultPrinter') || 'browser', 
  },

  // Action to change printer type (if you want a selector later)
  setDefaultPrinter: (type) => {
    localStorage.setItem('defaultPrinter', type);
    set((state) => ({ 
      settings: { ...state.settings, defaultPrinter: type } 
    }));
  },

 parseTimestamp: (ts) => {
    if (!ts) return null;
    if (typeof ts === 'string') return new Date(ts);
    if (ts.seconds) return new Date(ts.seconds * 1000);
    return new Date(ts);
  },

  isOrderStuck: (order) => {
    if (!order || !order.updated_at || ['picked_up', 'delivered'].includes(order.status)) return false;
    const lastUpdate = get().parseTimestamp(order.updated_at);
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate.getTime()) > (48 * 60 * 60 * 1000); 
  },

  // UPDATED: Now locks if status is 'picked_up' OR 'delivered'
  isOrderLocked: (order) => {
    if (!order || !order.updated_at) return false;
    
    const isTerminalStatus = ['picked_up', 'delivered'].includes(order.status);
    if (!isTerminalStatus) return false;
    
    const completionTime = get().parseTimestamp(order.updated_at);
    if (!completionTime) return false;
    
    // THRESHOLD: 10 Minutes (Allows for quick corrections, then locks permanently)
    return (Date.now() - completionTime.getTime()) > (10 * 60 * 1000);
  },

  // --- 2. FIREBASE SUBSCRIPTION ---
  subscribeToOrders: () => {
    set({ isLoading: true });
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const endOfYesterday = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1).toISOString();

    const qOrders = query(collection(db, "orders"), orderBy("created_at", "desc"));
    
    return onSnapshot(qOrders, (snapshot) => {
      const ordersList = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const safeDate = (field) => {
          if (!field) return null;
          if (typeof field.toDate === 'function') return field.toDate().toISOString();
          return new Date(field).toISOString();
        };

        return {
          id: docSnap.id,
          ...data,
          created_date: safeDate(data.created_at) || new Date().toISOString(),
          updated_at: safeDate(data.updated_at),
          picked_up_at: safeDate(data.picked_up_at)
        };
      });

      // Calculate Metrics...
      const salesToday = ordersList.filter(o => o.created_date >= startOfToday && o.is_paid).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const salesYesterdayTotal = ordersList.filter(o => o.created_date >= startOfYesterday && o.created_date <= endOfYesterday && o.is_paid).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const revenueAtRisk = ordersList.filter(o => !o.is_paid).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const staleOrders = ordersList.filter(o => !['picked_up', 'completed'].includes(o.status) && (Date.now() - new Date(o.updated_at || o.created_date).getTime()) > (48 * 60 * 60 * 1000));
      const finishedOrders = ordersList.filter(o => ['ready', 'completed', 'picked_up'].includes(o.status) && o.updated_at);
      const totalVelocityMS = finishedOrders.reduce((sum, o) => sum + Math.max(0, new Date(o.updated_at).getTime() - new Date(o.created_date).getTime()), 0);

      set({ 
        orders: ordersList, 
        isLoading: false,
        metrics: {
          salesToday, 
          salesYesterdayTotal,
          ordersTodayCount: ordersList.filter(o => o.created_date >= startOfToday).length,
          ordersYesterdayTotalCount: ordersList.filter(o => o.created_date >= startOfYesterday && o.created_date <= endOfYesterday).length,
          revenueAtRisk, 
          staleOrders, 
          topService: 'N/A', // Simplified for brevity
          avgVelocity: formatVelocity(finishedOrders.length > 0 ? totalVelocityMS / finishedOrders.length : 0),
        }
      });
    });
  },

  // --- 3. ACTIONS ---

  // Toggles and persistence
  toggleAutoPrint: () => {
    const newState = !get().settings.autoPrint;
    localStorage.setItem('autoPrint', newState);
    set((state) => ({ settings: { ...state.settings, autoPrint: newState } }));
  },


  togglePaymentStatus: async (orderId, targetStatus, method = 'Cash') => {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      is_paid: targetStatus,
      payment_method: targetStatus ? method : "Unpaid",
      updated_at: serverTimestamp()
    });
  },

  updateOrderStatus: async (order, newStatus) => {
    // SECURITY CHECK: Prevent moving a locked order
    if (get().isOrderLocked(order)) {
      throw new Error("This order is locked and cannot be modified.");
    }

    try {
      const orderRef = doc(db, "orders", order.id); 
      const updateData = { status: newStatus, updated_at: serverTimestamp() };

      if (newStatus === 'picked_up' || newStatus === 'delivered') { 
        updateData.is_paid = true; 
        updateData.completed_at = serverTimestamp();
        if (newStatus === 'picked_up') updateData.picked_up_at = serverTimestamp();
        if (newStatus === 'delivered') updateData.delivered_at = serverTimestamp();
      }

      await updateDoc(orderRef, updateData);
    } catch (e) { 
      console.error("Firebase Error:", e);
      throw e; 
    }
  },

  updateHandoverMethod: async (orderId, newMethod, newFee, newTotal) => {
    try {
      // Find the order in the current list to check its lock status
      const currentOrder = get().orders.find(o => o.id === orderId);
      if (currentOrder && get().isOrderLocked(currentOrder)) {
        throw new Error("Order is delivered/picked up and cannot be edited.");
      }

      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { 
        handover_method: newMethod,
        delivery_fee: Number(newFee),
        total_amount: Number(newTotal),
        updated_at: serverTimestamp() 
      });
      return true;
    } catch (error) {
      console.error("Store Update Error:", error);
      throw error;
    }
  },

  cancelOrder: async (orderId) => {
    try {
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
    } catch (error) {
      throw error;
    }
  }
}));