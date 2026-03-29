/**
 * @file useReportStore.js
 * @description State Management for Reports. 
 * Optimizes O(n) operations with single-pass Reducers and strict Data Sanitization.
 */

import { create } from 'zustand';
import { db } from '../../services/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

// 🛡️ SECURITY & RESILIENCE: Safe Date Parser
const parseSafeDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  const parsed = new Date(ts);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// 🛡️ XSS PREVENTION: Sanitize strings
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, "").trim(); 
};

export const useReportStore = create((set, get) => ({
  orders: [],
  isLoading: true,
  revenueTarget: 150000,

  subscribeToReports: () => {
    const q = query(collection(db, "orders"), orderBy("created_at", "desc"));
    
    return onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // 🛡️ DATA HYDRATION: Strictly coerce types to prevent NaN propagation
        return {
          id: doc.id,
          ...data,
          total_amount: Number(data.total_amount) || 0,
          customer_name: sanitizeString(data.customer_name) || "Guest",
          customer_phone: sanitizeString(data.customer_phone) || "unknown",
          status: sanitizeString(data.status),
          created_at: parseSafeDate(data.created_at) || new Date(),
          updated_at: parseSafeDate(data.updated_at),
          ready_at: parseSafeDate(data.ready_at),
          services: Array.isArray(data.services) ? data.services : []
        };
      });
      
      set({ orders: ordersData, isLoading: false });
    }, (error) => {
      console.error("[ReportStore] Sync Error:", error);
      // Fail-secure: Do not crash the app, show empty state
      set({ isLoading: false }); 
    });
  },

  getAnalytics: (days) => {
    const orders = get().orders || [];
    const cutoff = new Date();
    
    if (days !== 'year') {
      cutoff.setDate(cutoff.getDate() - parseInt(days || 7, 10));
    } else {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    }
    
    // ⚡ PERFORMANCE: Single-pass iteration to calculate ALL metrics simultaneously.
    // Removes O(3N) array chaining (.filter().reduce().filter()...)
    let totalRevenue = 0;
    let completedCount = 0;
    let totalTatMs = 0;
    let validOrderCount = 0;
    const customerMap = new Map();

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!o.created_at || o.created_at < cutoff) continue;

      validOrderCount++;
      totalRevenue += o.total_amount;

      // Customer Tracking
      const phone = o.customer_phone;
      const existing = customerMap.get(phone);
      if (existing) {
        existing.count += 1;
      } else {
        customerMap.set(phone, { count: 1, name: o.customer_name });
      }

      // Turn-Around Time (TAT) Tracking
      if (['ready', 'completed', 'picked_up'].includes(o.status)) {
        const finishDate = o.updated_at || o.ready_at;
        if (finishDate) {
          const diff = finishDate.getTime() - o.created_at.getTime();
          if (diff > 0) {
            totalTatMs += diff;
            completedCount++;
          }
        }
      }
    }

    const aov = validOrderCount > 0 ? totalRevenue / validOrderCount : 0;
    const avgTat = completedCount > 0 ? (totalTatMs / completedCount) / (1000 * 60 * 60) : 0;

    let returningCount = 0;
    const topCustomersArr = [];
    
    // Evaluate map elements
    for (const [phone, data] of customerMap.entries()) {
      if (data.count > 1) returningCount++;
      topCustomersArr.push({ phone, count: data.count, name: data.name });
    }

    const newCount = customerMap.size - returningCount;
    const retentionRate = customerMap.size > 0 ? (returningCount / customerMap.size) * 100 : 0;

    // Sort Top 10
    topCustomersArr.sort((a, b) => b.count - a.count);
    const topCustomers = topCustomersArr.slice(0, 10);

    return { 
      totalRevenue, 
      aov, 
      avgTat, 
      newCount, 
      returningCount, 
      retentionRate, 
      topCustomers, 
      totalOrders: validOrderCount 
    };
  },

  getSalesTrend: (range) => {
    const { orders } = get();
    const now = new Date();
    let data = [];

    // Pre-allocate arrays to prevent memory fragmentation
    if (range === "day") {
      data = Array(24).fill(0).map((_, i) => ({ label: `${i}`, value: 0 }));
      
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (o.created_at?.toDateString() === now.toDateString()) {
          const hour = o.created_at.getHours();
          data[hour].value += o.total_amount;
        }
      }
    } 
    else if (range === "days") {
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      data = Array(daysInMonth).fill(0).map((_, i) => ({ label: `${i + 1}`, value: 0 }));
      
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (o.created_at?.getMonth() === month && o.created_at?.getFullYear() === year) {
          const dayIdx = o.created_at.getDate() - 1;
          data[dayIdx].value += o.total_amount;
        }
      }
    }
    else if (range === "week") {
      data = [
        { label: 'Week 1', value: 0 }, { label: 'Week 2', value: 0 }, 
        { label: 'Week 3', value: 0 }, { label: 'Week 4', value: 0 }
      ];
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (o.created_at?.getMonth() === now.getMonth() && o.created_at?.getFullYear() === now.getFullYear()) {
          const weekNum = Math.floor((o.created_at.getDate() - 1) / 7);
          if (weekNum < 4) data[weekNum].value += o.total_amount;
        }
      }
    } 
    else if (range === "month") {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      data = months.map(m => ({ label: m, value: 0 }));
      
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (o.created_at?.getFullYear() === now.getFullYear()) {
          const monthIndex = o.created_at.getMonth();
          data[monthIndex].value += o.total_amount;
        }
      }
    }

    return data;
  },

  getPeakHours: () => {
    const orders = get().orders;
    const heatmap = Array(7).fill(0).map(() => Array(24).fill(0));
    
    for (let i = 0; i < orders.length; i++) {
      const d = orders[i].created_at;
      if (d) heatmap[d.getDay()][d.getHours()]++;
    }
    return heatmap;
  },

  getServiceAnalytics: (days) => {
    const orders = get().orders || [];
    const cutoff = new Date();
    
    if (days !== 'year') {
      cutoff.setDate(cutoff.getDate() - parseInt(days || 7, 10));
    } else {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    }

    const serviceMap = {};
    let totalVolumeCount = 0;

    // ⚡ PERFORMANCE: Replaced nested `.forEach()` with fast standard `for` loops
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (!order.created_at || order.created_at < cutoff) continue;
      
      const services = order.services;
      for (let j = 0; j < services.length; j++) {
        const s = services[j];
        // Normalize names and strictly prevent Prototype Pollution
        const name = sanitizeString(s.service_name).toUpperCase();
        if (!name) continue;

        const qty = Number(s.quantity || s.weight_kg) || 0;
        const revenue = Number(s.price_per_unit || 0) * qty;

        if (!serviceMap[name]) {
          serviceMap[name] = { name, count: 0, revenue: 0, totalQty: 0 };
        }

        serviceMap[name].count += 1;
        serviceMap[name].totalQty += qty;
        serviceMap[name].revenue += revenue;
        totalVolumeCount += 1;
      }
    }

    return Object.values(serviceMap)
      .sort((a, b) => b.count - a.count)
      .map((service, index) => ({
        ...service,
        share: totalVolumeCount > 0 ? (service.count / totalVolumeCount) * 100 : 0,
        rank: index + 1,
      }))
      .slice(0, 5); 
  },
}));