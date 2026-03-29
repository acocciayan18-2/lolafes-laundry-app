import { create } from 'zustand';
import { db } from '../../services/firebase';
import { collection, getDocs, writeBatch, query } from 'firebase/firestore';
import { useNotificationStore } from '../ui/useNotificationStore';
import { useActivityStore } from '../activities/useActivityStore';
// ✨ FIX 1: Import your order/report store so we can update the UI
import { useReportStore } from '../reports/useReportStore'; 

const CLEANUP_STRATEGY = {
  activities: () => useActivityStore.getState().clearLocalState?.() || 
                    useActivityStore.setState({ activities: [], hasMore: false }),
  
  orders: () => {
    const fetchOrders = useReportStore.getState().fetchOrders; // Or whatever your fetch function is named
    if (fetchOrders) fetchOrders();
  },
  cancelled_orders: null,
  reward_logs: null,
  notifications: null,
};

const FIRESTORE_BATCH_LIMIT = 500;

export const useCleanupStore = create((set, get) => ({
  isProcessing: null,
  error: null,

  executeCleanup: async (collectionName, filterQuery = null) => {
    if (!Object.keys(CLEANUP_STRATEGY).includes(collectionName)) {
      console.error(`[Security Alert]: Unauthorized cleanup attempt on ${collectionName}`);
      return { success: false, error: "Unauthorized collection access." };
    }

    if (get().isProcessing) return;

    const { showNotification } = useNotificationStore.getState();
    set({ isProcessing: collectionName, error: null });

    try {
      const colRef = collection(db, collectionName);
      
      let q = colRef;
      if (filterQuery) {
        q = Array.isArray(filterQuery) ? query(colRef, ...filterQuery) : query(colRef, filterQuery);
      }
      
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        showNotification(`No records found in ${collectionName.replace('_', ' ')}.`, "info");
        return { success: true, count: 0 };
      }

      const docs = snapshot.docs;
      let deletedCount = 0;

      for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT);
        
        chunk.forEach((doc) => batch.delete(doc.ref));
        await batch.commit(); 
        deletedCount += chunk.length;
      }

      const postCleanupAction = CLEANUP_STRATEGY[collectionName];
      if (postCleanupAction) postCleanupAction();

      showNotification(`Purged ${deletedCount} ${collectionName.replace('_', ' ')} records.`, "success");
      return { success: true, count: deletedCount };

    } catch (error) {
      const sanitizedError = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Cleanup Failure]: ${collectionName} ->`, sanitizedError);
      
      set({ error: sanitizedError });
      showNotification("Database transaction failed. Records preserved.", "error");
      return { success: false, error: sanitizedError };

    } finally {
      set({ isProcessing: null });
    }
  }
}));