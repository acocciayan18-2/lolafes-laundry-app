import { create } from 'zustand';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const useSettingsStore = create((set, get) => ({
  receiptConfig: {
    storeName: "LOLA FE'S LAUNDRY",
    address: "",
    phone: "",
    email: "",
    website: "",
    footerMessage: "Clean clothes, Happy life!",
    showOrderDate: true,
    showPrintDate: true,
    // 🛡️ NEW: Global toggle for the Print Receipt button visibility
    showPrintReceipt: true, 
  },
  isLoading: true,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const docRef = doc(db, "settings", "receipt");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        set({ 
          receiptConfig: { ...get().receiptConfig, ...docSnap.data() }, 
          isLoading: false 
        });
      } else {
        // Initialize Firebase with defaults if document doesn't exist
        await setDoc(docRef, get().receiptConfig);
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      set({ isLoading: false });
    }
  },

  // Optimized to handle single field updates (like a toggle) or full forms
  updateReceiptConfig: async (newConfig) => {
    try {
      const docRef = doc(db, "settings", "receipt");
      // Merge: true is critical here to prevent overwriting the whole object
      await setDoc(docRef, newConfig, { merge: true });
      
      // Update local state immediately for snappy UI
      set((state) => ({
        receiptConfig: { ...state.receiptConfig, ...newConfig }
      }));
      
      return { success: true };
    } catch (error) {
      console.error("Update error:", error);
      return { success: false, error };
    }
  },

  // Real-time Listener: Ensures all admin/staff screens stay in sync
  subscribeToSettings: () => {
    const docRef = doc(db, "settings", "receipt");
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        set({ receiptConfig: snapshot.data(), isLoading: false });
      }
    });
  }
}));