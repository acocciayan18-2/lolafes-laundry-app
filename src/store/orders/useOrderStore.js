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

  // --- 1. CENTRALIZED UTILITIES ---
  parseTimestamp: (ts) => {
    if (!ts) return null;
    return ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  },

  isOrderStuck: (order) => {
    if (!order || !order.updated_at || order.status === 'picked_up') return false;
    
    const lastUpdate = get().parseTimestamp(order.updated_at);
    if (!lastUpdate) return false;
    
    // THRESHOLD: 48 Hours
    return (Date.now() - lastUpdate.getTime()) > (48 * 60 * 60 * 1000); 
  },

  isOrderLocked: (order) => {
    if (!order || order.status !== 'picked_up' || !order.updated_at) return false;
    
    const pickedUpTime = get().parseTimestamp(order.updated_at);
    if (!pickedUpTime) return false;
    
    // THRESHOLD: 10 Minutes
    return (Date.now() - pickedUpTime.getTime()) > (10 * 60 * 1000);
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
        return {
          id: docSnap.id,
          ...data,
          created_date: data.created_at?.toDate().toISOString() || new Date().toISOString(),
          updated_at: data.updated_at?.toDate().toISOString() || null
        };
      });

      // Financials & Volume
      const salesToday = ordersList
        .filter(o => o.created_date >= startOfToday && o.is_paid)
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      const salesYesterdayTotal = ordersList
        .filter(o => o.created_date >= startOfYesterday && o.created_date <= endOfYesterday && o.is_paid)
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      const revenueAtRisk = ordersList.filter(o => !o.is_paid).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      // Stale Orders (48 Hours)
      const staleOrders = ordersList.filter(o => {
        if (['picked_up', 'completed'].includes(o.status)) return false;
        const lastTime = new Date(o.updated_at || o.created_date).getTime();
        return (Date.now() - lastTime) > (48 * 60 * 60 * 1000);
      }).map(o => ({ order_number: o.order_number, customer_name: o.customer_name, status: o.status }));

      // Velocity Logic
      const finishedOrders = ordersList.filter(o => ['ready', 'completed', 'picked_up'].includes(o.status) && o.updated_at);
      const totalVelocityMS = finishedOrders.reduce((sum, o) => {
        const diff = new Date(o.updated_at).getTime() - new Date(o.created_date).getTime();
        return sum + (diff > 0 ? diff : 0);
      }, 0);

      // Analytics
      const serviceCounts = {};
      ordersList.forEach(o => o.services?.forEach(s => { 
        serviceCounts[s.service_name] = (serviceCounts[s.service_name] || 0) + 1;
      }));
      const topService = Object.entries(serviceCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';

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
          topService,
          avgVelocity: formatVelocity(finishedOrders.length > 0 ? totalVelocityMS / finishedOrders.length : 0),
        }
      });
    });
  },

  // --- 3. ACTIONS ---
  togglePaymentStatus: async (orderId, currentStatus, method = 'Cash') => {
    const newStatus = !currentStatus;
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      is_paid: newStatus,
      payment_method: newStatus ? method : "Unpaid" 
    });
  },

  updateOrderStatus: async (order, newStatus) => {
    try {
      const orderRef = doc(db, "orders", order.id); 
      const updateData = { status: newStatus, updated_at: serverTimestamp() };

      if (newStatus === 'picked_up') { 
        updateData.is_paid = true; 
        updateData.picked_up_at = new Date().toISOString();
      }

      await updateDoc(orderRef, updateData);
    } catch (e) { 
      console.error("Firebase Update Error:", e);
      throw e; 
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
      console.error("Cancellation Error:", error);
      throw error;
    }
  }
}));