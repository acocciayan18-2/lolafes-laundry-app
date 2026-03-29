import { addDoc, collection, getDocs, limit, orderBy, query,  startAfter } from 'firebase/firestore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { db } from '../../services/firebase';

export const useActivityStore = create(
  persist(
    (set, get) => ({
      activities: [],
      isFetching: false,
      hasMore: true,

      fetchActivities: async (isLoadMore = false) => {
        const { activities, isFetching, hasMore } = get();
        if (isFetching || (isLoadMore && !hasMore)) return;

        set({ isFetching: true });

        try {
          const activityRef = collection(db, "activities");
          const BATCH_LIMIT = 10;
          let q;
          
          if (isLoadMore && activities.length > 0) {
            const lastItem = activities[activities.length - 1];
            q = query(
              activityRef, 
              orderBy("timestamp", "desc"), 
              startAfter(lastItem.timestamp), 
              limit(BATCH_LIMIT)
            );
          } else {
            q = query(activityRef, orderBy("timestamp", "desc"), limit(BATCH_LIMIT));
          }

          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            set({ hasMore: false, isFetching: false });
            return;
          }

          const newActivities = snapshot.docs.map(doc => ({ 
            ...doc.data(), 
            activity_id: doc.id 
          }));

          const mergedActivities = isLoadMore 
            ? [...activities, ...newActivities].filter((v, i, a) => a.findIndex(t => (t.activity_id === v.activity_id)) === i)
            : newActivities;

          set({
            activities: mergedActivities,
            hasMore: snapshot.docs.length === BATCH_LIMIT,
          });

        } catch (error) {
          console.error("Error fetching activities:", error);
        } finally {
          set({ isFetching: false });
        }
      },

      // ❌ cleanupExpiredActivities REMOVED

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

          if (lastActivity && lastActivity.timestamp) {
            const timeDiff = Date.now() - new Date(lastActivity.timestamp).getTime();
            if (timeDiff < 5000) {
              if (isSystemLog && lastActivity.customLabel === customLabel) return;
              if (!isSystemLog && lastActivity.order_number === safeOrderNumber && lastActivity.customLabel === customLabel) return;
              if (customLabel === 'Order Created' && lastActivity.order_number === safeOrderNumber) return;
            }
          }

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

          set((state) => {
            const filtered = state.activities.filter(a => a.activity_id !== activity_id);
            // Still capping local memory at 100 for browser performance, but Firebase keeps ALL.
            return { activities: [newActivity, ...filtered].slice(0, 100) }; 
          });

          await addDoc(collection(db, "activities"), newActivity);
          
        } catch (error) {
          console.error("Activity Logging Error:", error);
        }
      },
    }),
    {
      name: 'laundry-activity-log',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activities: state.activities }),
      // ❌ onRehydrateStorage cleanup REMOVED
    }
  )
);