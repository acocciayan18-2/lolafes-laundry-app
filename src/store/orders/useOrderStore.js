import { create } from 'zustand';
import { db } from '../../services/firebase';
<<<<<<< HEAD
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
=======
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, serverTimestamp, getDoc, setDoc, deleteDoc 
} from 'firebase/firestore';
>>>>>>> Karen2.0

// --- HELPER: DYNAMIC TIME FORMATTER ---
const formatVelocity = (ms) => {
  if (!ms || ms <= 0) return "0 secs";
<<<<<<< HEAD
  
=======
>>>>>>> Karen2.0
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

<<<<<<< HEAD
  if (hours > 0) {
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  }
  if (minutes > 0) {
    return `${minutes} mins`;
  }
=======
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes} mins`;
>>>>>>> Karen2.0
  return `${seconds} secs`;
};

export const useOrderStore = create((set, get) => ({
  orders: [],
  metrics: {
<<<<<<< HEAD
    salesToday: 0,
    salesYesterdayTotal: 0,
    ordersTodayCount: 0,
    ordersYesterdayTotalCount: 0,
    revenueAtRisk: 0,
    staleOrders: [],
    avgVelocity: "0 secs", // Now stores the formatted string
=======
    salesToday: 0, 
    salesYesterdayTotal: 0, 
    ordersTodayCount: 0,
    ordersYesterdayTotalCount: 0, 
    revenueAtRisk: 0, 
    staleOrders: [],
    avgVelocity: "0 secs", 
>>>>>>> Karen2.0
    topService: 'N/A',
  },
  isLoading: true,

<<<<<<< HEAD
  subscribeToOrders: () => {
    set({ isLoading: true });

=======
  // --- 1. CENTRALIZED UTILITIES ---
 parseTimestamp: (ts) => {
  if (!ts) return null;
  // Handle ISO strings (which we created in the map above)
  if (typeof ts === 'string') return new Date(ts);
  // Handle raw Firestore Timestamps (if called elsewhere)
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
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
    
>>>>>>> Karen2.0
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const endOfYesterday = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1).toISOString();

    const qOrders = query(collection(db, "orders"), orderBy("created_at", "desc"));
    
<<<<<<< HEAD
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
=======
    return onSnapshot(qOrders, (snapshot) => {
      const ordersList = snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    
    // Helper to safely convert Firestore Timestamps to ISO strings
    const safeDate = (field) => {
      if (!field) return null;
      // If it's a Firestore Timestamp, it has a .toDate() method
      if (typeof field.toDate === 'function') {
        return field.toDate().toISOString();
      }
      // If it's already a string or Date object
      return new Date(field).toISOString();
    };

    return {
      id: docSnap.id,
      ...data,
      created_date: safeDate(data.created_at) || new Date().toISOString(),
      updated_at: safeDate(data.updated_at),
      picked_up_at: safeDate(data.picked_up_at) // This will now return null safely if missing
    };
  });

      // Financials & Volume
>>>>>>> Karen2.0
      const salesToday = ordersList
        .filter(o => o.created_date >= startOfToday && o.is_paid)
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      const salesYesterdayTotal = ordersList
        .filter(o => o.created_date >= startOfYesterday && o.created_date <= endOfYesterday && o.is_paid)
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

<<<<<<< HEAD
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
=======
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
>>>>>>> Karen2.0
      const serviceCounts = {};
      ordersList.forEach(o => o.services?.forEach(s => { 
        serviceCounts[s.service_name] = (serviceCounts[s.service_name] || 0) + 1;
      }));
      const topService = Object.entries(serviceCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';

      set({ 
        orders: ordersList, 
<<<<<<< HEAD
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
=======
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
    
    // Standard update for all status changes
    const updateData = { 
      status: newStatus, 
      updated_at: serverTimestamp() 
    };

    // --- ACCURATE HANDOVER LOGIC ---
    if (newStatus === 'picked_up') { 
      // 1. Ensure order is marked as paid upon handover
      updateData.is_paid = true; 
      
      // 2. Lock in the handover time using Server Time for 100% accuracy
      updateData.picked_up_at = serverTimestamp();
      
      
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
>>>>>>> Karen2.0
  }
}));