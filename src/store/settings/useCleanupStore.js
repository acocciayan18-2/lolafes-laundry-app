import { create } from 'zustand';
import { db } from '../../services/firebase';
import { collection, query, getDocs, writeBatch } from 'firebase/firestore';
import { useNotificationStore } from '../ui/useNotificationStore';

export const useCleanupStore = create((set) => ({
  isProcessing: null, // Track which cleanup is running

  executeCleanup: async (collectionName, filterQuery = null) => {
    const showNotification = useNotificationStore.getState().showNotification;
    set({ isProcessing: collectionName });

    try {
      const colRef = collection(db, collectionName);
      const q = filterQuery ? query(colRef, filterQuery) : colRef;
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        showNotification(`No ${collectionName.replace('_', ' ')} found to clean.`, "info");
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      showNotification(`Successfully cleared ${snapshot.size} records.`, "success");
    } catch (error) {
      console.error(`Cleanup failed for ${collectionName}:`, error);
      showNotification("Cleanup failed. Check logs.", "error");
    } finally {
      set({ isProcessing: null });
    }
  }
}));