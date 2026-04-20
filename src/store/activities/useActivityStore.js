/**
 * @file useActivityStore.js
 * @description Enterprise-grade State Management for System Logs.
 * Features: Server-side date filtering, cursor-based pagination, and secure event debouncing.
 */

import { addDoc, collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../../services/firebase';

// 🛡️ UTILITY: Secure Date Parser
const getStartAndEndOfDate = (dateStr) => {
  if (!dateStr) return { start: null, end: null };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { start: null, end: null };

  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
  return { start, end };
};

export const useActivityStore = create((set, get) => ({
  activities: [],
  isFetching: false,
  hasMore: true,
  error: null,

  fetchActivities: async (payload = { date: "", loadMore: false }) => {
    const { date, loadMore } = payload;
    const { activities, isFetching, hasMore } = get();

    // 🛡️ QA FIX: The Deadlock Resolver
    // We only block the request if it's a "Load More" pagination spam. 
    // If the user selects a NEW date, we MUST let it execute to override the current state.
    if (loadMore && (isFetching || !hasMore)) return;

    set({ isFetching: true, error: null });

    try {
      const activityRef = collection(db, "activities");
      const BATCH_LIMIT = 15; 
      
      // 1. Build Query Constraints
      let queryConstraints = [orderBy("timestamp", "desc")];

      // 2. Apply Date Filters (If selected)
      const { start, end } = getStartAndEndOfDate(date);
      if (start && end) {
        queryConstraints.push(where("timestamp", ">=", start));
        queryConstraints.push(where("timestamp", "<=", end));
      }

      // 3. Handle Pagination Cursors
      if (loadMore && activities.length > 0) {
        const lastItem = activities[activities.length - 1];
        queryConstraints.push(startAfter(lastItem.timestamp));
      }

      queryConstraints.push(limit(BATCH_LIMIT));

      // 4. Execute Query
      const q = query(activityRef, ...queryConstraints);
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // If we were loading more, just say no more. If it's a fresh date, empty the array.
        set({ hasMore: false, isFetching: false, activities: loadMore ? activities : [] });
        return;
      }

      const newActivities = snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        activity_id: doc.id 
      }));

      // 5. Merge & Deduplicate
      const mergedActivities = loadMore 
        ? [...activities, ...newActivities].filter((v, i, a) => a.findIndex(t => (t.activity_id === v.activity_id)) === i)
        : newActivities;

      set({
        activities: mergedActivities,
        hasMore: snapshot.docs.length === BATCH_LIMIT,
        isFetching: false // Always successfully unlocks the UI!
      });

    } catch (error) {
      console.error("[ActivityStore] Error fetching activities:", error);
      set({ isFetching: false, error: "Failed to establish secure connection to log server." });
    }
  },

  logActivity: async (orderOrMessage, status, metadata = {}) => {
    try {
      const isSystemLog = typeof orderOrMessage === 'string';
      const safeOrderNumber = isSystemLog ? "SETTINGS" : String(orderOrMessage?.order_number || "LOG").substring(0, 50);
      const safeCustomerName = isSystemLog ? "System" : String(orderOrMessage?.customer_name || "System").substring(0, 100);
      const safeStatus = isSystemLog ? "Updated" : String(status || "N/A").substring(0, 50);
      const customLabel = String(isSystemLog ? orderOrMessage : (metadata?.label || 'Order Created')).substring(0, 200);
      const actionType = String(isSystemLog ? 'system_update' : (metadata?.action || 'status_update')).substring(0, 50);

      const { activities } = get();
      const lastActivity = activities[0];

      // 🛡️ DEBOUNCER: Prevent double-logging identical rapid events
      if (lastActivity && lastActivity.timestamp) {
        const timeDiff = Date.now() - new Date(lastActivity.timestamp).getTime();
        if (timeDiff < 5000) {
          if (isSystemLog && lastActivity.customLabel === customLabel) return;
          if (!isSystemLog && lastActivity.order_number === safeOrderNumber && lastActivity.customLabel === customLabel) return;
          if (customLabel === 'Order Created' && lastActivity.order_number === safeOrderNumber) return;
        }
      }

      // Filter out useless "pending" transition logs unless specifically labeled
      if (!isSystemLog && actionType === 'status_update' && safeStatus.toLowerCase() === 'pending' && !metadata?.label) return; 

      const activity_id = crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);
      const timestamp = new Date().toISOString();

      const newActivity = {
        activity_id,
        timestamp,
        customer_name: safeCustomerName,
        order_number: safeOrderNumber,
        status: safeStatus,
        actionType,
        customLabel,
      };

      // ✨ OPTIMISTIC UI UPDATE
      set((state) => {
        const filtered = state.activities.filter(a => a.activity_id !== activity_id);
        return { activities: [newActivity, ...filtered] }; 
      });

      // Write to Firebase safely in the background
      await addDoc(collection(db, "activities"), newActivity);
      
    } catch (error) {
      console.error("[ActivityStore] Logging Error:", error);
    }
  },
}));