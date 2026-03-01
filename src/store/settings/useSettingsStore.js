import { create } from 'zustand';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const useSettingsStore = create((set, get) => ({
  // 1. ADD ALL NEW FIELDS HERE
  receiptConfig: {
    storeName: "LOLA FE'S LAUNDRY",
    address: "",
    phone: "",
    email: "",
    website: "",
    footerMessage: "Clean clothes, Happy life!",
    showOrderDate: true,  // 👈 Ensure these are here
    showPrintDate: true,  // 👈 Ensure these are here
  },
  isLoading: true,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const docRef = doc(db, "settings", "receipt");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Merge fetched data with defaults to avoid missing field errors
        set({ 
          receiptConfig: { ...get().receiptConfig, ...docSnap.data() }, 
          isLoading: false 
        });
      } else {
        await setDoc(docRef, get().receiptConfig);
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      set({ isLoading: false });
    }
  },

  updateReceiptConfig: async (newConfig) => {
    try {
      const docRef = doc(db, "settings", "receipt");
      // Use { merge: true } so we don't accidentally delete other settings
      await setDoc(docRef, newConfig, { merge: true });
      set({ receiptConfig: newConfig });
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },

  // 2. THIS IS THE KEY: Real-time Listener
  subscribeToSettings: () => {
    const docRef = doc(db, "settings", "receipt");
    // Return the unsubscribe function so we can clean up in useEffect
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        
        set({ receiptConfig: snapshot.data(), isLoading: false });
      }
    });
  }
}));