import { create } from 'zustand';
import { db } from '../../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export const useSettingsStore = create((set, get) => ({
  // 1. BRANDING & VISUALS
  receiptConfig: {
    storeName: "LOLA FE'S LAUNDRY",
    address: "",
    phone: "",
    email: "",
    website: "",
    footerMessage: "Clean clothes, Happy life!",
    showOrderDate: true,
    showPrintDate: true,
    showPrintReceipt: true,
  },

  // 2. SYSTEM LOGIC & SECURITY
  systemConfig: {
    autoPrint: false, 
    autoLogout: false,
    ownerPIN: null, // ✨ null indicates setup is required
    operatingHours: {
      allowedDays: [],
      openTime: "08:00",
      closeTime: "22:00",
      isEnabled: false
    }
  },

  isLoading: true,

  // --- 🛡️ SECURITY LOGIC (INTERNAL HELPERS) ---
  
  /**
   * Scenario: Verify PIN instantly without database lag
   */
  verifyPIN: (input) => {
    const stored = get().systemConfig.ownerPIN;
    // What-If: No PIN set? Allow access for setup.
    if (!stored) return true; 
    return input === stored;
  },

  /**
   * Scenario: Setting or Updating the PIN
   */
  setOwnerPIN: async (newPin) => {
    // ✨ FIXED: Changed regex to \d{6} to enforce exactly 6 digits!
    if (!/^\d{6}$/.test(newPin)) {
      return { success: false, error: "PIN must be 6 digits" };
    }
    return await get().updateSystemConfig({ ownerPIN: newPin });
  },

  // --- 🔄 DATA SYNCING ---

  subscribeToSettings: () => {
    set({ isLoading: true });
    
    const receiptRef = doc(db, "settings", "receipt");
    const systemRef = doc(db, "settings", "system");

    const unsubReceipt = onSnapshot(receiptRef, (snap) => {
      if (snap.exists()) {
        set((state) => ({ 
          receiptConfig: { ...state.receiptConfig, ...snap.data() } 
        }));
      }
    });

    const unsubSystem = onSnapshot(systemRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        set((state) => ({ 
          systemConfig: { 
            ...state.systemConfig, 
            ...data,
            operatingHours: { ...state.systemConfig.operatingHours, ...data.operatingHours }
          }, 
          isLoading: false 
        }));
      } else {
        set({ isLoading: false });
      }
    });

    return () => {
      unsubReceipt();
      unsubSystem();
    };
  },

  updateReceiptConfig: async (newConfig) => {
    try {
      const docRef = doc(db, "settings", "receipt");
      await setDoc(docRef, newConfig, { merge: true });
      return { success: true }; 
    } catch (error) {
      console.error("Receipt Update Error:", error);
      return { success: false, error };
    }
  },

  updateSystemConfig: async (updates) => {
    try {
      const docRef = doc(db, "settings", "system");
      await setDoc(docRef, updates, { merge: true });
      return { success: true };
    } catch (error) {
      console.error("System Update Error:", error);
      return { success: false, error };
    }
  },

  toggleAutoPrint: () => {
    const current = get().systemConfig.autoPrint;
    return get().updateSystemConfig({ autoPrint: !current });
  },

  toggleAutoLogout: () => {
    const current = get().systemConfig.autoLogout;
    return get().updateSystemConfig({ autoLogout: !current });
  },

  setOperatingHours: async (config) => {
    return await get().updateSystemConfig({ operatingHours: config });
  }
}));