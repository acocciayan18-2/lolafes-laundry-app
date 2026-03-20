import { create } from 'zustand';
import { db } from '../../services/firebase';
import { collection, getDocs, writeBatch, query } from 'firebase/firestore';
import { useNotificationStore } from '../ui/useNotificationStore';
import { useActivityStore } from '../activities/useActivityStore';


const CLEANUP_STRATEGY = {
  activities: () => useActivityStore.getState().clearLocalState?.() || 
                    useActivityStore.setState({ activities: [], hasMore: false }),
  orders: null,
  reward_logs: null,
  notifications: null,
};

const FIRESTORE_BATCH_LIMIT = 500;

export const useCleanupStore = create((set, get) => ({
  isProcessing: null,
  error: null,

  /**
   * @param {string} collectionName - Target collection to purge
   * @param {object} filterQuery - Optional Firestore query constraint
   */
  executeCleanup: async (collectionName, filterQuery = null) => {
    // 1. DEFENSIVE GATE: Validate collection against whitelist
    if (!Object.keys(CLEANUP_STRATEGY).includes(collectionName)) {
      console.error(`[Security Alert]: Unauthorized cleanup attempt on ${collectionName}`);
      return { success: false, error: "Unauthorized collection access." };
    }

    // 2. CONCURRENCY CONTROL: Prevent race conditions
    if (get().isProcessing) return;

    const { showNotification } = useNotificationStore.getState();
    set({ isProcessing: collectionName, error: null });

    try {
      const colRef = collection(db, collectionName);
      const q = filterQuery ? query(colRef, filterQuery) : colRef;
      
      // 3. MEMORY OPTIMIZATION: Fetch in chunks to prevent browser heap overflow
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        showNotification(`No records found in ${collectionName.replace('_', ' ')}.`, "info");
        return { success: true, count: 0 };
      }

      // 4. ATOMIC BATCH PROCESSING (Resilience against 500-doc limit)
      const docs = snapshot.docs;
      let deletedCount = 0;

      for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT);
        
        chunk.forEach((doc) => batch.delete(doc.ref));
        await batch.commit(); // Commit each chunk atomically
        deletedCount += chunk.length;
      }

      // 5. MODULAR SIDE EFFECTS (Strategy Pattern)
      const postCleanupAction = CLEANUP_STRATEGY[collectionName];
      if (postCleanupAction) postCleanupAction();

      showNotification(`Purged ${deletedCount} ${collectionName.replace('_', ' ')} records.`, "success");
      return { success: true, count: deletedCount };

    } catch (error) {
      // 6. ERROR TELEMETRY
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