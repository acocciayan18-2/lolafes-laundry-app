import { addDoc, collection, getDocs, limit, orderBy, query, where, writeBatch, startAfter } from 'firebase/firestore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { db } from '../../services/firebase';

export const useActivityStore = create(
  persist(
    (set, get) => ({
      activities: [],
      isFetching: false,
      lastDoc: null, // ✨ Cursor for pagination
      hasMore: true, // ✨ Flag for the UI

      // ✨ UPDATED: Logic to support "Load More"
      fetchActivities: async (isLoadMore = false) => {
        const { lastDoc, activities, isFetching } = get();
        if (isFetching) return;

        set({ isFetching: true });

        try {
          const activityRef = collection(db, "activities");
          const BATCH_LIMIT = 10; // Fetch only 10 at a time
          
          let q;
          if (isLoadMore && lastDoc) {
            // Start after the last document we received
            q = query(activityRef, orderBy("timestamp", "desc"), startAfter(lastDoc), limit(BATCH_LIMIT));
          } else {
            // Fresh fetch
            q = query(activityRef, orderBy("timestamp", "desc"), limit(BATCH_LIMIT));
          }

          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            set({ hasMore: false });
            return;
          }

          const newActivities = snapshot.docs.map(doc => ({ 
            ...doc.data(), 
            activity_id: doc.id 
          }));

          const lastVisible = snapshot.docs[snapshot.docs.length - 1];

          set({
            activities: isLoadMore ? [...activities, ...newActivities] : newActivities,
            lastDoc: lastVisible,
            hasMore: snapshot.docs.length === BATCH_LIMIT, // If less than limit, we reached the end
          });

        } catch (error) {
          console.error("Error fetching activities:", error);
        } finally {
          set({ isFetching: false });
        }
      },

      cleanupExpiredActivities: async () => {
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const cutoffDate = new Date(now - thirtyDaysInMs).toISOString();

        set((state) => ({
          activities: state.activities.filter((activity) => {
            const activityTime = new Date(activity.timestamp).getTime();
            return now - activityTime < thirtyDaysInMs;
          }),
        }));

        try {
          const q = query(collection(db, "activities"), where("timestamp", "<", cutoffDate));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
          }
        } catch (error) { 
          console.error("Cloud cleanup failed:", error); 
        }
      },

      logActivity: async (order, status, metadata = {}) => {
        const customLabel = metadata?.label || 'Order Created';
        const actionType = metadata?.action || 'status_update';

        // Duplicate Guard
        const lastActivity = get().activities[0];
        if (lastActivity) {
          const isSameOrder = lastActivity.order_number === order?.order_number;
          const timeDiff = Date.now() - new Date(lastActivity.timestamp).getTime();

          if (isSameOrder && lastActivity.customLabel === customLabel && timeDiff < 5000) return;
          if (customLabel === 'Order Created' && isSameOrder && timeDiff < 5000) return;
        }

        // Noise Filter
        if (actionType === 'status_update' && status?.toLowerCase() === 'pending' && !metadata?.label) return; 

        const activity_id = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const newActivity = {
          customer_name: order?.customer_name || "System",
          order_number: order?.order_number || "LOG",
          status: status || "N/A",
          actionType,
          customLabel,
          activity_id,
          timestamp,
        };

        try {
          await addDoc(collection(db, "activities"), newActivity);
          // Only update local state if DB write succeeds to keep UI in sync with server
          set((state) => ({
            activities: [newActivity, ...state.activities].slice(0, 50),
          }));
        } catch (error) {
          console.error("Firebase Save Error:", error);
        }
      },

      clearHistory: () => set({ activities: [], lastDoc: null, hasMore: true }),
    }),
    {
      name: 'laundry-activity-log',
      storage: createJSONStorage(() => localStorage),
      // We don't persist lastDoc because Firestore cursors aren't easily serializable
      partialize: (state) => ({ activities: state.activities }),
      onRehydrateStorage: () => (state) => {
        if (state) state.cleanupExpiredActivities();
      },
    }
  )
);