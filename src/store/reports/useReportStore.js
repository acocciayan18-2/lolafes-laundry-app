import { create } from 'zustand';
import { db } from '../../services/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

export const useReportStore = create((set, get) => ({
  orders: [],
  isLoading: true,
  revenueTarget: 150000,

  subscribeToReports: () => {
    const q = query(collection(db, "orders"), orderBy("created_at", "desc"));
    
    return onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data();
<<<<<<< HEAD
        return {
          id: doc.id,
          ...data,
          // Safety parsing for Firestore Timestamps
          created_at: data.created_at?.toDate?.() || (data.created_at ? new Date(data.created_at) : new Date()),
          ready_at: data.ready_at?.toDate?.() || (data.ready_at ? new Date(data.ready_at) : null),
        };
=======
        // Inside subscribeToReports mapping
return {
  id: doc.id,
  ...data,
  created_at: data.created_at?.toDate?.() || (data.created_at ? new Date(data.created_at) : new Date()),
  updated_at: data.updated_at?.toDate?.() || (data.updated_at ? new Date(data.updated_at) : null), // Add this!
  ready_at: data.ready_at?.toDate?.() || (data.ready_at ? new Date(data.ready_at) : null),
};
>>>>>>> Karen2.0
      });
      
      set({ orders: ordersData, isLoading: false });
    });
  },

  getAnalytics: (days) => {
<<<<<<< HEAD
    const orders = get().orders || [];
    const cutoff = new Date();
    
    if (days !== 'year') {
      cutoff.setDate(cutoff.getDate() - parseInt(days || 7));
    } else {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    }
    
    const filtered = orders.filter(o => o.created_at >= cutoff);
    const totalRevenue = filtered.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const aov = filtered.length > 0 ? totalRevenue / filtered.length : 0;

    const completedOrders = filtered.filter(o => 
      o.ready_at && o.created_at && o.ready_at.getTime() >= o.created_at.getTime()
    );

    const avgTat = completedOrders.length > 0 
      ? completedOrders.reduce((sum, o) => sum + (o.ready_at.getTime() - o.created_at.getTime()), 0) / completedOrders.length / 3600000 
      : 0;

    const customerMap = new Map();
    filtered.forEach(o => {
      const phone = o.customer_phone || 'unknown';
      customerMap.set(phone, (customerMap.get(phone) || 0) + 1);
    });
    
    const returningCount = Array.from(customerMap.values()).filter(count => count > 1).length;
    const newCount = customerMap.size - returningCount;
    const retentionRate = customerMap.size > 0 ? (returningCount / customerMap.size) * 100 : 0;

    const topCustomers = Array.from(customerMap.entries())
      .map(([phone, count]) => ({ 
        phone, 
        count, 
        name: filtered.find(o => o.customer_phone === phone)?.customer_name || "Guest" 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Safety return to prevent .toLocaleString() errors in UI
    return { 
      totalRevenue: totalRevenue || 0, 
      aov: aov || 0, 
      avgTat: avgTat || 0, 
      newCount: newCount || 0, 
      returningCount: returningCount || 0, 
      retentionRate: retentionRate || 0, 
      topCustomers: topCustomers || [], 
      totalOrders: filtered.length || 0 
    };
  },
=======
  const orders = get().orders || [];
  const cutoff = new Date();
  
  if (days !== 'year') {
    cutoff.setDate(cutoff.getDate() - parseInt(days || 7));
  } else {
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  }
  
  const filtered = orders.filter(o => o.created_at >= cutoff);
  const totalRevenue = filtered.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const aov = filtered.length > 0 ? totalRevenue / filtered.length : 0;

  const completedOrders = filtered.filter(o => 
    ['ready', 'completed', 'picked_up'].includes(o.status) && 
    (o.updated_at || o.ready_at) && 
    o.created_at
  );

  const totalTatMs = completedOrders.reduce((sum, o) => {
    // Fallback logic: check updated_at (from your OrderStore) then ready_at
    const finishDate = o.updated_at ? new Date(o.updated_at) : new Date(o.ready_at);
    const startDate = new Date(o.created_at);
    
    const diff = finishDate.getTime() - startDate.getTime();
    return sum + (diff > 0 ? diff : 0);
  }, 0);

  // Convert MS to Hours
  const avgTat = completedOrders.length > 0 
    ? (totalTatMs / completedOrders.length) / (1000 * 60 * 60) 
    : 0;
  // ------------------------------------

  const customerMap = new Map();
  filtered.forEach(o => {
    const phone = o.customer_phone || 'unknown';
    customerMap.set(phone, (customerMap.get(phone) || 0) + 1);
  });
  
  const returningCount = Array.from(customerMap.values()).filter(count => count > 1).length;
  const newCount = customerMap.size - returningCount;
  const retentionRate = customerMap.size > 0 ? (returningCount / customerMap.size) * 100 : 0;

  const topCustomers = Array.from(customerMap.entries())
    .map(([phone, count]) => ({ 
      phone, 
      count, 
      name: filtered.find(o => o.customer_phone === phone)?.customer_name || "Guest" 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { 
    totalRevenue: totalRevenue || 0, 
    aov: aov || 0, 
    avgTat: avgTat || 0, 
    newCount: newCount || 0, 
    returningCount: returningCount || 0, 
    retentionRate: retentionRate || 0, 
    topCustomers: topCustomers || [], 
    totalOrders: filtered.length || 0 
  };
},
>>>>>>> Karen2.0

  getSalesTrend: (range) => {
    const { orders } = get();
    const now = new Date();
    let data = [];

<<<<<<< HEAD
    // 1. TODAY: Hours 0-23 (UI will filter for 5am-12am)
=======
    // 1. TODAY: Hours 0-23 (UI will filter for 5am-12a
>>>>>>> Karen2.0
    if (range === "day") {
      data = Array(24).fill(0).map((_, i) => ({ label: `${i}`, value: 0 }));
      orders.filter(o => o.created_at.toDateString() === now.toDateString())
            .forEach(o => {
              const hour = o.created_at.getHours();
              if (data[hour]) data[hour].value += Number(o.total_amount || 0);
            });
    } 

    // 2. DAYS: Sun-Sat for the current week
   else if (range === "days") {
      // Get the number of days in the current month
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Initialize array for each day of the month (1 to 28/30/31)
      data = Array(daysInMonth).fill(0).map((_, i) => ({ 
        label: `${i + 1}`, 
        value: 0 
      }));
      
      orders.filter(o => 
        o.created_at.getMonth() === month && 
        o.created_at.getFullYear() === year
      ).forEach(o => {
        const dayOfMonth = o.created_at.getDate(); // Returns 1-31
        // Subtract 1 because array is 0-indexed
        if (data[dayOfMonth - 1]) {
          data[dayOfMonth - 1].value += Number(o.total_amount || 0);
        }
      });
    }

    // 3. WEEK: Wk 1-4 for the current month
    else if (range === "week") {
      data = [
        { label: 'Week 1', value: 0 }, { label: 'Week 2', value: 0 }, 
        { label: 'Week 3', value: 0 }, { label: 'Week 4', value: 0 }
      ];
      orders.filter(o => 
        o.created_at.getMonth() === now.getMonth() && 
        o.created_at.getFullYear() === now.getFullYear()
      ).forEach(o => {
        const weekNum = Math.floor((o.created_at.getDate() - 1) / 7);
        if (data[weekNum]) data[weekNum].value += Number(o.total_amount || 0);
      });
    } 

    // 4. MONTH: Jan-Dec for the current year
    else if (range === "month") {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      data = months.map(m => ({ label: m, value: 0 }));
      
      orders.filter(o => o.created_at.getFullYear() === now.getFullYear())
            .forEach(o => {
              const monthIndex = o.created_at.getMonth();
              if (data[monthIndex]) data[monthIndex].value += Number(o.total_amount || 0);
            });
    }

    return data;
  },

  getPeakHours: () => {
    const orders = get().orders;
    const heatmap = Array(7).fill(0).map(() => Array(24).fill(0));
    
    orders.forEach(o => {
      const d = o.created_at;
      if (d instanceof Date && !isNaN(d)) {
        heatmap[d.getDay()][d.getHours()]++;
      }
    });
    return heatmap;
  }
}));