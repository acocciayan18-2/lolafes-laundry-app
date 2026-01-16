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
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.() || new Date(data.created_at) || new Date(),
          ready_at: data.ready_at?.toDate?.() || (data.ready_at ? new Date(data.ready_at) : null),
        };
      });
      
      set({ orders: ordersData, isLoading: false });
    });
  },

  getAnalytics: (days) => {
    const orders = get().orders;
    
    const cutoff = new Date();
    if (days !== 'year') {
      cutoff.setDate(cutoff.getDate() - parseInt(days));
    } else {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    }
    
    const filtered = orders.filter(o => o.created_at >= cutoff);
    const totalRevenue = filtered.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const aov = filtered.length > 0 ? totalRevenue / filtered.length : 0;

    // --- ACCURATE TAT CALCULATION ---
    // 1. Only include orders that have both timestamps and where ready_at is after created_at
    const completedOrders = filtered.filter(o => 
      o.ready_at && 
      o.created_at && 
      o.ready_at.getTime() >= o.created_at.getTime()
    );

    const avgTat = completedOrders.length > 0 
      ? completedOrders.reduce((sum, o) => {
          // Calculate difference in milliseconds
          const diff = o.ready_at.getTime() - o.created_at.getTime();
          return sum + diff;
        }, 0) / completedOrders.length / 3600000 // Convert total millisecond average to hours
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

    return { totalRevenue, aov, avgTat, newCount, returningCount, retentionRate, topCustomers, totalOrders: filtered.length };
  },

  getSalesTrend: (range) => {
    const { orders } = get();
    const now = new Date();
    let data = [];

    if (range === "day") {
      data = Array(24).fill(0).map((_, i) => ({ label: `${i}h`, value: 0 }));
      orders.filter(o => o.created_at.toDateString() === now.toDateString())
            .forEach(o => data[o.created_at.getHours()].value += Number(o.total_amount || 0));
    } 
    else if (range === "week") {
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      data = days.map(d => ({ label: d, value: 0 }));
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      orders.filter(o => o.created_at >= weekAgo)
            .forEach(o => data[o.created_at.getDay()].value += Number(o.total_amount || 0));
    } 
    else if (range === "month") {
      data = [
        { label: 'wk 1', value: 0 }, { label: 'wk 2', value: 0 }, 
        { label: 'wk 3', value: 0 }, { label: 'wk 4', value: 0 }
      ];
      orders.filter(o => o.created_at.getMonth() === now.getMonth())
            .forEach(o => {
              const weekNum = Math.floor((o.created_at.getDate() - 1) / 7);
              if (data[weekNum]) data[weekNum].value += Number(o.total_amount || 0);
            });
    } 
  // ... inside useReportStore getSalesTrend function
else if (range === "year") {
  // 1. Initialize 12 months with 3-letter abbreviations
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  data = months.map(m => ({ label: m, value: 0 }));
  
  // 2. Filter for orders within the current calendar year
  const currentYear = now.getFullYear();
  
  orders.forEach(o => {
    const orderDate = o.created_at;
    
    // Check if the order belongs to the current year
    if (orderDate instanceof Date && orderDate.getFullYear() === currentYear) {
      const monthIndex = orderDate.getMonth(); // 0 for Jan, 11 for Dec
      
      // 3. Accumulate the total amount into the correct month bucket
      if (data[monthIndex]) {
        data[monthIndex].value += Number(o.total_amount || 0);
      }
    }
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