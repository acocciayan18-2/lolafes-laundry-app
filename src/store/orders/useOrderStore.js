import { create } from 'zustand';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// --- HELPER: DYNAMIC TIME FORMATTER ---
const formatVelocity = (ms) => {
  if (!ms || ms <= 0) return "0 secs";
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  }
  if (minutes > 0) {
    return `${minutes} mins`;
  }
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
    avgVelocity: "0 secs", // Now stores the formatted string
    topService: 'N/A',
  },
  isLoading: true,

  subscribeToOrders: () => {
    set({ isLoading: true });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const endOfYesterday = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1).toISOString();

    const qOrders = query(collection(db, "orders"), orderBy("created_at", "desc"));
    
    const unsub = onSnapshot(qOrders, (snapshot) => {
      const ordersList = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          created_date: data.created_at?.toDate().toISOString() || new Date().toISOString(),
          updated_at: data.updated_at?.toDate().toISOString() || null
        };
      });

      // 1. Financials & Volume
      const salesToday = ordersList
        .filter(o => o.created_date >= startOfToday && o.is_paid)
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      const salesYesterdayTotal = ordersList
        .filter(o => o.created_date >= startOfYesterday && o.created_date <= endOfYesterday && o.is_paid)
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      const ordersTodayCount = ordersList.filter(o => o.created_date >= startOfToday).length;
      const ordersYesterdayTotalCount = ordersList.filter(o => o.created_date >= startOfYesterday && o.created_date <= endOfYesterday).length;
      const revenueAtRisk = ordersList.filter(o => !o.is_paid).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      // 2. Dynamic Stale Alerts (> 1.5 hours inactive)
      const staleOrders = ordersList.filter(o => {
        if (['picked_up', 'completed'].includes(o.status)) return false;
        const lastTime = new Date(o.updated_at || o.created_date).getTime();
        return (Date.now() - lastTime) / 3600000 > 1.5;
      }).map(o => ({
        order_number: o.order_number,
        customer_name: o.customer_name,
        status: o.status
      }));

      // 3. Completion Velocity Logic (Calculated in Milliseconds for Precision)
      const finishedOrders = ordersList.filter(o => 
        ['ready', 'completed', 'picked_up'].includes(o.status) && 
        o.updated_at && 
        o.created_date
      );

      const totalVelocityMS = finishedOrders.reduce((sum, o) => {
        const start = new Date(o.created_date).getTime();
        const end = new Date(o.updated_at).getTime();
        const diff = end - start;
        return sum + (diff > 0 ? diff : 0);
      }, 0);

      const avgVelocityMS = finishedOrders.length > 0 ? totalVelocityMS / finishedOrders.length : 0;
      
      // Convert MS to human-readable string (e.g., "15 mins", "2h 5m")
      const readableVelocity = formatVelocity(avgVelocityMS);

      // 4. Analytics
      const serviceCounts = {};
      ordersList.forEach(o => o.services?.forEach(s => { 
        serviceCounts[s.service_name] = (serviceCounts[s.service_name] || 0) + 1;
      }));
      const topService = Object.entries(serviceCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';

      set({ 
        orders: ordersList, 
        metrics: {
          salesToday,
          salesYesterdayTotal,
          ordersTodayCount,
          ordersYesterdayTotalCount,
          revenueAtRisk,
          staleOrders,
          avgVelocity: readableVelocity, // Storing formatted string
          topService
        },
        isLoading: false 
      });
    });

    return unsub;
  },

  togglePaymentStatus: async (orderId, currentStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { is_paid: !currentStatus, updated_at: serverTimestamp() });
    } catch (e) { console.error(e); }
  },

  updateOrderStatus: async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const updateData = { status: newStatus, updated_at: serverTimestamp() };
      if (newStatus === 'picked_up') { updateData.is_paid = true; }
      await updateDoc(orderRef, updateData);
    } catch (e) { console.error(e); }
  }
}));