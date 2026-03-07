import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  doc, setDoc, collection, onSnapshot, deleteDoc,
  query, orderBy, updateDoc, writeBatch // ✨ Added writeBatch
} from 'firebase/firestore';
import { useNotificationStore } from '../ui/useNotificationStore';

export const usePaymentSettingsStore = create((set, get) => ({
  methods: [], 
  isLoading: true,

  fetchPaymentMethods: () => {
    set({ isLoading: true });
    const methodsRef = collection(db, 'settings/data/payment_methods');
    const q = query(methodsRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      set({ methods: list, isLoading: false });
    });
  },

  /**
   * ✨ NEW: Set Default Logic
   * Uses a batch to unset the old default and set the new one simultaneously.
   */
  setDefaultMethod: async (methodId) => {
    const showNotify = useNotificationStore.getState().showNotification;
    const currentMethods = get().methods;

    try {
      const batch = writeBatch(db);

      currentMethods.forEach((method) => {
        const docRef = doc(db, 'settings/data/payment_methods', method.id);
        batch.update(docRef, { 
          isDefault: method.id === methodId,
          // We force the default to be active so it's usable in New Order
          isActive: method.id === methodId ? true : method.isActive 
        });
      });

      await batch.commit();
      showNotify('Default payment method updated', 'success');
      return true;
    } catch (error) {
      console.error("Batch Error:", error);
      showNotify('Failed to update default', 'error');
      return false;
    }
  },

  addMethod: async (name) => {
    const cleanName = name.trim();
    if (!cleanName) return false;
    const showNotify = useNotificationStore.getState().showNotification;
    
    try {
      const newMethodRef = doc(collection(db, 'settings/data/payment_methods'));
      await setDoc(newMethodRef, { 
        name: cleanName, 
        isDefault: false,
        isActive: true,
        createdAt: Date.now() 
      });
      showNotify(`Added ${cleanName}`, 'success');
      return true;
    } catch (error) {
      showNotify('Failed to add method', 'error');
      return false;
    }
  },

  toggleMethodStatus: async (id, newStatus) => {
    const showNotify = useNotificationStore.getState().showNotification;
    const method = get().methods.find(m => m.id === id);

    // 🛡️ Guard: Prevent deactivating the default method
    if (!newStatus && method?.isDefault) {
      showNotify('Cannot deactivate the default method', 'error');
      return false;
    }

    try {
      const docRef = doc(db, "settings/data/payment_methods", id);
      await updateDoc(docRef, { isActive: newStatus });
      return true;
    } catch (error) {
      showNotify('Failed to update status', 'error');
      return false;
    }
  },

  deleteMethod: async (id) => {
    const showNotify = useNotificationStore.getState().showNotification;
    const methodToDelete = get().methods.find(m => m.id === id);
    if (methodToDelete?.isDefault) return;

    try {
      await deleteDoc(doc(db, 'settings/data/payment_methods', id));
      showNotify('Payment method removed', 'success');
    } catch (error) {
      showNotify('Failed to delete', 'error');
    }
  }
}));