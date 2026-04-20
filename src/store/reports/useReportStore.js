/**
 * @file useReportStore.js
 * @description State Management for Reports. 
 * Fully automated Engine merging Immutable Order Profit with Monthly Ledger Expenses.
 */

import { create } from 'zustand';
import { db } from '../../services/firebase';
import { collection, query, onSnapshot, orderBy, getDocs, where } from 'firebase/firestore';

const parseSafeDate = (ts) => {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  const parsed = new Date(ts);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, "").trim(); 
};

// 🧠 REUSABLE KPI ENGINE: Now extracts dynamic Total Profit
const calculateKpiMetrics = (ordersArray) => {
  let totalRevenue = 0;
  let totalProfit = 0; // ✨ NEW: Tracks actual profit
  let completedCount = 0;
  let totalTatMs = 0;
  let validOrderCount = 0;
  const customerMap = new Map();

  for (let i = 0; i < ordersArray.length; i++) {
    const o = ordersArray[i];
    validOrderCount++;
    totalRevenue += (o.total_amount || 0);
    totalProfit += (o.net_profit || 0); // ✨ Mapping profit from payload

    const phone = o.customer_phone;
    if (phone) {
      const existing = customerMap.get(phone);
      if (existing) {
        existing.count += 1;
      } else {
        customerMap.set(phone, { count: 1, name: o.customer_name });
      }
    }

    if (['ready', 'completed', 'picked_up'].includes(o.status)) {
      const finishDate = o.updated_at || o.ready_at;
      if (finishDate && o.created_at) {
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
  
  for (const [phone, data] of customerMap.entries()) {
    if (data.count > 1) returningCount++;
    topCustomersArr.push({ phone, count: data.count, name: data.name });
  }

  const newCount = customerMap.size - returningCount;
  const retentionRate = customerMap.size > 0 ? (returningCount / customerMap.size) * 100 : 0;

  topCustomersArr.sort((a, b) => b.count - a.count);
  const topCustomers = topCustomersArr.slice(0, 10);

  return { 
    totalRevenue, totalProfit, aov, avgTat, newCount, returningCount, retentionRate, topCustomers, totalOrders: validOrderCount 
  };
};

export const useReportStore = create((set, get) => ({
  orders: [],
  isLoading: true,

  salesTrendData: [],
  isTrendLoading: false,
  trendError: null,

  profitTrendData: { chartData: [], maxVal: 100, totalNetProfit: 0 },
  isProfitLoading: false,
  profitError: null,

  fetchProfitTrend: async (payload, abortSignal) => {
    set({ isProfitLoading: true, profitError: null });
    try {
      const { range, year, month } = payload;
      const now = new Date();
      let startDate, endDate, dataBuckets = [];
      let startMonthStr, endMonthStr;

      if (range === 'week') {
        const first = now.getDate() - now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), first, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), first + 6, 23, 59, 59);
        dataBuckets = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => ({ label: d, shortLabel: d, netProfit: 0 }));
        startMonthStr = startDate.toISOString().slice(0,7);
        endMonthStr = endDate.toISOString().slice(0,7);
      } else if (range === 'month' || range === 'specific_month') {
        const targetYear = year || now.getFullYear();
        const targetMonth = range === 'month' ? now.getMonth() : month;
        startDate = new Date(targetYear, targetMonth, 1);
        endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
        dataBuckets = Array.from({ length: endDate.getDate() }, (_, i) => ({ label: `Day ${i + 1}`, shortLabel: `${i + 1}`, netProfit: 0 }));
        startMonthStr = startDate.toISOString().slice(0,7);
        endMonthStr = startMonthStr;
      } else if (range === 'year') {
        const targetYear = year || now.getFullYear();
        startDate = new Date(targetYear, 0, 1);
        endDate = new Date(targetYear, 11, 31, 23, 59, 59);
        dataBuckets = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => ({ label: m, shortLabel: m, netProfit: 0 }));
        startMonthStr = `${targetYear}-01`;
        endMonthStr = `${targetYear}-12`;
      }

      const qOrders = query(collection(db, "orders"), where("created_at", ">=", startDate), where("created_at", "<=", endDate));
      const qExpenses = query(collection(db, "expenses"), where("applicable_month", ">=", startMonthStr), where("applicable_month", "<=", endMonthStr));
      
      const [snapshotOrders, snapshotExpenses] = await Promise.all([getDocs(qOrders), getDocs(qExpenses)]);
      if (abortSignal?.aborted) return;

      const monthlyExpenses = {};
      snapshotExpenses.docs.forEach(doc => {
          const data = doc.data();
          const amt = Number(data.amount) || 0;
          const mStr = data.applicable_month;
          if (!monthlyExpenses[mStr]) monthlyExpenses[mStr] = 0;
          monthlyExpenses[mStr] += amt;
      });

      let totalNetProfit = 0;
      let currentPeak = 0;

      snapshotOrders.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'cancelled' || !data.is_paid) return;

        const createdAt = parseSafeDate(data.created_at);
        if (!createdAt) return;

        const profit = Number(data.net_profit) || 0;

        let binIndex = -1;
        if (range === 'week') binIndex = createdAt.getDay();
        else if (range === 'month' || range === 'specific_month') binIndex = createdAt.getDate() - 1;
        else if (range === 'year') binIndex = createdAt.getMonth();

        if (binIndex >= 0 && binIndex < dataBuckets.length) {
          dataBuckets[binIndex].netProfit += profit;
        }
      });

      if (range === 'year') {
          dataBuckets.forEach((bin, i) => {
              const targetYearStr = year || now.getFullYear();
              const mStr = `${targetYearStr}-${String(i + 1).padStart(2, '0')}`; 
              const monthlyOverhead = monthlyExpenses[mStr] || 0;
              
              bin.orderProfit = bin.netProfit; 
              bin.monthlyOverhead = monthlyOverhead;

              bin.netProfit -= monthlyOverhead; 
              totalNetProfit += bin.netProfit;
              if (bin.netProfit > currentPeak) currentPeak = bin.netProfit;
          });
      } else if (range === 'month' || range === 'specific_month') {
          let sumOfBars = 0;
          dataBuckets.forEach(bin => {
              bin.orderProfit = bin.netProfit;
              bin.monthlyOverhead = 0;
              sumOfBars += bin.netProfit;
              if (bin.netProfit > currentPeak) currentPeak = bin.netProfit;
          });
          const monthlyOverhead = monthlyExpenses[startMonthStr] || 0;
          totalNetProfit = sumOfBars - monthlyOverhead;
      } else if (range === 'week') {
          dataBuckets.forEach(bin => {
              bin.orderProfit = bin.netProfit;
              bin.monthlyOverhead = 0;
              totalNetProfit += bin.netProfit;
              if (bin.netProfit > currentPeak) currentPeak = bin.netProfit;
          });
      }

      set({ 
        profitTrendData: { chartData: dataBuckets, maxVal: currentPeak > 0 ? currentPeak : 100, totalNetProfit }, 
        isProfitLoading: false 
      });

    } catch (error) {
      if (abortSignal?.aborted) return; 
      console.error("[Profit Fetch Error]:", error);
      set({ profitError: error.message, isProfitLoading: false });
    }
  },

  fetchKpiAnalytics: async (payload, abortSignal) => {
    set({ isKpiLoading: true, kpiError: null });
    try {
      const { range, value } = payload;
      let startDate, endDate;
      const now = new Date();

      // ✨ NEW: Support strictly "Today" filters directly from Backend
      if (range === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (range === 'days') {
        startDate = new Date();
        startDate.setDate(now.getDate() - value);
        endDate = now;
      } else if (range === 'year') {
        startDate = new Date(value, 0, 1); 
        endDate = new Date(value, 11, 31, 23, 59, 59); 
      }

      const q = query(collection(db, "orders"), where("created_at", ">=", startDate), where("created_at", "<=", endDate));
      const snapshot = await getDocs(q);
      if (abortSignal?.aborted) return; 

      const targetOrders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          total_amount: Number(data.total_amount) || 0,
          net_profit: Number(data.net_profit) || 0, // ✨ INJECTED
          customer_phone: sanitizeString(data.customer_phone),
          customer_name: sanitizeString(data.customer_name),
          status: sanitizeString(data.status),
          created_at: parseSafeDate(data.created_at),
          updated_at: parseSafeDate(data.updated_at),
          ready_at: parseSafeDate(data.ready_at),
        };
      });

      set({ kpiData: calculateKpiMetrics(targetOrders), isKpiLoading: false });
    } catch (error) {
      if (abortSignal?.aborted) return; 
      set({ kpiError: error.message, isKpiLoading: false });
    }
  },

  fetchSalesTrend: async (payload, abortSignal) => {
    set({ isTrendLoading: true, trendError: null });
    try {
      const { range, year, month } = payload;
      const now = new Date();
      let startDate, endDate, dataBuckets = [];

      if (range === 'day') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        dataBuckets = Array.from({ length: 24 }, (_, i) => ({ label: `${i}`, value: 0 }));
      } else if (range === 'days') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        dataBuckets = Array.from({ length: endDate.getDate() }, (_, i) => ({ label: `${i + 1}`, value: 0 }));
      } else if (range === 'specific_month') {
        const targetYear = year || now.getFullYear();
        const targetMonth = month !== undefined ? month : now.getMonth(); 
        startDate = new Date(targetYear, targetMonth, 1);
        endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
        dataBuckets = Array.from({ length: endDate.getDate() }, (_, i) => ({ label: `${i + 1}`, value: 0 }));
      } else if (range === 'month') {
        const targetYear = year || now.getFullYear();
        startDate = new Date(targetYear, 0, 1);
        endDate = new Date(targetYear, 11, 31, 23, 59, 59);
        dataBuckets = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => ({ label: m, value: 0 }));
      }

      const q = query(collection(db, "orders"), where("created_at", ">=", startDate), where("created_at", "<=", endDate));
      const snapshot = await getDocs(q);
      if (abortSignal?.aborted) return;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'cancelled' || !data.is_paid) return;
        const createdAt = parseSafeDate(data.created_at);
        if (!createdAt) return;
        const amount = Number(data.total_amount) || 0;

        if (range === 'day') dataBuckets[createdAt.getHours()].value += amount;
        else if (range === 'days' || range === 'specific_month') dataBuckets[createdAt.getDate() - 1].value += amount;
        else if (range === 'month') dataBuckets[createdAt.getMonth()].value += amount;
      });

      set({ salesTrendData: dataBuckets, isTrendLoading: false });
    } catch (error) {
      if (abortSignal?.aborted) return; 
      set({ trendError: error.message, isTrendLoading: false });
    }
  },

  fetchServiceAnalytics: async (payload, abortSignal) => {
    set({ isServiceLoading: true, serviceError: null });

    try {
      const { range, value } = payload;
      let startDate, endDate;
      const now = new Date();

      if (range === 'days') {
        startDate = new Date();
        startDate.setDate(now.getDate() - value);
        endDate = now;
      } else if (range === 'year') {
        startDate = new Date(value, 0, 1); 
        endDate = new Date(value, 11, 31, 23, 59, 59); 
      }

      const q = query(collection(db, "orders"), where("created_at", ">=", startDate), where("created_at", "<=", endDate));
      const snapshot = await getDocs(q);
      
      if (abortSignal?.aborted) return;

      const serviceMap = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!Array.isArray(data.services)) return;

        data.services.forEach(s => {
          const safeKey = sanitizeString(s.service_name).toUpperCase();
          if (!safeKey || safeKey === '__PROTO__') return;

          const qty = Number(s.quantity || s.weight_kg) || 0;
          const revenue = Number(s.price_per_kg || 0) * qty;

          if (!serviceMap[safeKey]) {
            serviceMap[safeKey] = { name: sanitizeString(s.service_name), count: 0, revenue: 0, totalQty: 0 };
          }

          serviceMap[safeKey].count += 1; 
          serviceMap[safeKey].totalQty += qty; 
          serviceMap[safeKey].revenue += revenue; 
        });
      });

      const finalData = Object.values(serviceMap);
      set({ serviceAnalyticsData: finalData, isServiceLoading: false });

    } catch (error) {
      if (abortSignal?.aborted) return; 
      set({ serviceError: error.message, isServiceLoading: false });
    }
  },

  // Heatmap extraction engine for RushPulse
  getPeakHours: () => {
    const orders = get().orders || [];
    const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (order.status === 'cancelled') continue;
      
      const d = order.created_at;
      if (d && d instanceof Date && !isNaN(d.getTime())) {
        heatmap[d.getDay()][d.getHours()]++;
      }
    }
    return heatmap;
  },
  
  subscribeToReports: () => {
    const q = query(collection(db, "orders"), orderBy("created_at", "desc"));
    return onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data();
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
    }, () => set({ isLoading: false }));
  },
}));