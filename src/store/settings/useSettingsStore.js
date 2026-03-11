import { create } from 'zustand';
import { db } from '../../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// 🛡️ DEFAULT FALLBACKS
const DEFAULT_RECEIPT = {
  storeName: "LOLA FE'S LAUNDRY",
  address: "",
  phone: "",
  email: "",
  website: "",
  footerMessage: "Clean clothes, Happy life!",
  showOrderDate: true,
  showPrintDate: true,
  showPrintReceipt: true,
};

const DEFAULT_SYSTEM = {
  autoPrint: false, 
  autoLogout: false,
  confirmCompletion: true, 
  ownerPIN: null, 
  operatingHours: {
    allowedDays: [],
    openTime: "08:00",
    closeTime: "22:00",
    isEnabled: false
  }
};

export const useSettingsStore = create((set, get) => ({
  // 1. STATE
  receiptConfig: DEFAULT_RECEIPT,
  systemConfig: DEFAULT_SYSTEM,
  
  // Track loading individually to prevent race conditions
  isLoadingReceipt: true,
  isLoadingSystem: true,

  // --- 🛡️ SECURITY LOGIC ---
  verifyPIN: (input) => {
    const stored = get().systemConfig?.ownerPIN;
    if (!stored) return true; 
    return String(input) === String(stored);
  },

  setOwnerPIN: async (newPin) => {
    if (!/^\d{6}$/.test(String(newPin))) {
      return { success: false, error: "Security PIN must be exactly 6 digits." };
    }
    return await get().updateSystemConfig({ ownerPIN: String(newPin) });
  },

  // --- 🔄 DATA SYNCING ---
  subscribeToSettings: () => {
    set({ isLoadingReceipt: true, isLoadingSystem: true });
    
    const receiptRef = doc(db, "settings", "receipt");
    const systemRef = doc(db, "settings", "system");

    let unsubReceipt = () => {};
    let unsubSystem = () => {};

    try {
      unsubReceipt = onSnapshot(receiptRef, 
        (snap) => {
          if (snap.exists()) {
            set((state) => ({ 
              receiptConfig: { ...DEFAULT_RECEIPT, ...state.receiptConfig, ...snap.data() },
              isLoadingReceipt: false
            }));
          } else {
            set({ isLoadingReceipt: false });
          }
        },
        (error) => {
          console.error("Firebase Receipt Sync Error:", error);
          set({ isLoadingReceipt: false });
        }
      );

      unsubSystem = onSnapshot(systemRef, 
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            
            set((state) => {
              const mergedOperatingHours = {
                ...DEFAULT_SYSTEM.operatingHours,
                ...state.systemConfig?.operatingHours,
                ...(data.operatingHours || {})
              };

              return { 
                systemConfig: { 
                  ...DEFAULT_SYSTEM,
                  ...state.systemConfig, 
                  ...data,
                  operatingHours: mergedOperatingHours
                }, 
                isLoadingSystem: false 
              };
            });
          } else {
            set({ isLoadingSystem: false });
          }
        },
        (error) => {
          console.error("Firebase System Sync Error:", error);
          set({ isLoadingSystem: false });
        }
      );
    } catch (error) {
      console.error("Failed to initialize settings listeners:", error);
      set({ isLoadingReceipt: false, isLoadingSystem: false });
    }

    return () => {
      unsubReceipt();
      unsubSystem();
    };
  },

  // --- 📝 DATABASE WRITERS ---
  updateReceiptConfig: async (newConfig) => {
    try {
      const docRef = doc(db, "settings", "receipt");
      await setDoc(docRef, newConfig, { merge: true });
      return { success: true }; 
    } catch (error) {
      console.error("Receipt Update Error:", error);
      return { success: false, error: error.message };
    }
  },

  updateSystemConfig: async (updates) => {
    try {
      const docRef = doc(db, "settings", "system");
      await setDoc(docRef, updates, { merge: true });
      return { success: true };
    } catch (error) {
      console.error("System Update Error:", error);
      return { success: false, error: error.message };
    }
  },

  // --- ⚙️ QUICK TOGGLES ---
  toggleAutoPrint: () => {
    const current = get().systemConfig?.autoPrint ?? false;
    return get().updateSystemConfig({ autoPrint: !current });
  },

  toggleAutoLogout: () => {
    const current = get().systemConfig?.autoLogout ?? false;
    return get().updateSystemConfig({ autoLogout: !current });
  },

  toggleConfirmCompletion: () => {
    const current = get().systemConfig?.confirmCompletion ?? true;
    return get().updateSystemConfig({ confirmCompletion: !current });
  },

  setOperatingHours: async (config) => {
    if (typeof config !== 'object' || !config) {
      return { success: false, error: "Invalid configuration payload" };
    }
    return await get().updateSystemConfig({ operatingHours: config });
  }
}));