<<<<<<< HEAD
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useActivityStore = create(
  persist(
    (set) => ({
      activities: [],

     logActivity: (order, status, metadata = { action: 'status_update', label: '' }) => {
  // 1. FILTER: If it's just a generic pending update (not the initial creation), skip it
  if (metadata.action === 'status_update' && status.toLowerCase() === 'pending' && !metadata.label) {
    return; 
  }

  const activity_id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  set((state) => {
    // 2. DEDUPLICATION: Don't log the same action twice in a row
    const lastActivity = state.activities[0];
    if (
      lastActivity && 
      lastActivity.order_number === order.order_number && 
      lastActivity.actionType === metadata.action
    ) {
      return state;
    }

    const newActivity = {
      ...order,
      status: status,
      actionType: metadata.action,
      customLabel: metadata.label,
      activity_id,
      timestamp,
    };

    return {
      activities: [newActivity, ...state.activities].slice(0, 50),
    };
  });
},
=======
import { addDoc, collection, getDocs, limit, orderBy, query, where, writeBatch } from 'firebase/firestore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { db } from '../../services/firebase';

export const useActivityStore = create(
  persist(
    (set, get) => ({
      activities: [],
      isFetching: false,

      fetchActivitiesFromFirebase: async () => {
        set({ isFetching: true });
        try {
          const q = query(collection(db, "activities"), orderBy("timestamp", "desc"), limit(30));
          const querySnapshot = await getDocs(q);
          const fetchedActivities = querySnapshot.docs.map(doc => ({ ...doc.data(), activity_id: doc.id }));
          set({ activities: fetchedActivities });
        } catch (error) {
          console.error("Error fetching activities:", error);
        } finally {
          set({ isFetching: false });
        }
      },

      cleanupExpiredActivities: async () => {
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const cutoffDate = new Date(now - thirtyDaysInMs);

        set((state) => ({
          activities: state.activities.filter((activity) => {
            const activityTime = new Date(activity.timestamp).getTime();
            return now - activityTime < thirtyDaysInMs;
          }),
        }));

        try {
          const q = query(collection(db, "activities"), where("timestamp", "<", cutoffDate.toISOString()));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
          }
        } catch (error) { console.error("Cloud cleanup failed:", error); }
      },

      logActivity: async (order, status, metadata = {}) => {
        // --- 1. RESOLVE LABEL PRIORITY ---
        // If metadata has a label, use it. Otherwise, default to "Order Created"
        const customLabel = metadata?.label || 'Order Created';
        const actionType = metadata?.action || 'status_update';

        // --- 2. PREVENT DUPLICATION (THE GUARD) ---
        const lastActivity = get().activities[0];
        if (lastActivity) {
          const isSameOrder = lastActivity.order_number === order?.order_number;
          const timeDiff = Date.now() - new Date(lastActivity.timestamp).getTime();

          // Rule A: If exact same label for the same order within 5 seconds, block it.
          if (isSameOrder && lastActivity.customLabel === customLabel && timeDiff < 5000) {
            return;
          }

          // Rule B: If the incoming log is a generic "Order Created" but we just 
          // logged a specific service action for this item, block the generic one.
          if (customLabel === 'Order Created' && isSameOrder && timeDiff < 5000) {
            return;
          }
        }

        // --- 3. FILTER SYSTEM NOISE ---
        if (actionType === 'status_update' && status?.toLowerCase() === 'pending' && !metadata?.label) {
          return; 
        }

        const activity_id = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const newActivity = {
          customer_name: order?.customer_name || "System",
          order_number: order?.order_number || "LOG",
          status: status || "N/A",
          actionType,
          customLabel, // This will now correctly be "Service Created"
          activity_id,
          timestamp,
        };

        try {
          await addDoc(collection(db, "activities"), newActivity);
        } catch (error) {
          console.error("Firebase Save Error:", error);
        }

        set((state) => ({
          activities: [newActivity, ...state.activities].slice(0, 50),
        }));
      },
>>>>>>> Karen2.0

      clearHistory: () => set({ activities: [] }),
    }),
    {
      name: 'laundry-activity-log',
      storage: createJSONStorage(() => localStorage),
<<<<<<< HEAD
=======
      onRehydrateStorage: () => (state) => {
        if (state) state.cleanupExpiredActivities();
      },
>>>>>>> Karen2.0
    }
  )
);