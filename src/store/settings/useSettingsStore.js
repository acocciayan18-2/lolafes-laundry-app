import { create } from 'zustand';
import { db } from '../../services/firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

/**
 * @file SettingsStore.js
 * @description Enterprise-grade settings management for Lola Fe's Laundry POS.
 * Implements defensive data merging, Prototype Pollution guards, and strict type safety.
 */

const DEFAULT_RECEIPT = Object.freeze({
  storeName: "LOLA FE'S LAUNDRY",
  address: "",
  phone: "",
  email: "",
  website: "",
  footerMessage: "Clean clothes, Happy life!",
  showOrderDate: true,
  showPrintDate: true,
  showPrintReceipt: true,
});

const DEFAULT_SYSTEM = Object.freeze({
  autoPrint: false, 
  autoLogout: false,
  confirmCompletion: true, 
  // ✨ KEPT: This is our single source of truth for the default printer
  printerType: 'browser', 
  ownerPIN: null, 
  enableOrderTracking: true, 
  operatingHours: Object.freeze({
    allowedDays: [],
    openTime: "08:00",
    closeTime: "22:00",
    isEnabled: false
  })
});

/**
 * 🛡️ DEFENSIVE UTILITY: Secure Deep Merge
 * Prevents Prototype Pollution (CWE-1321) if malicious nested payloads are retrieved from Firestore.
 */
const secureDeepMerge = (target, source) => {
  const output = { ...target };
  if (source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      // Prevent overriding fundamental Object properties
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;

      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = secureDeepMerge(target[key] || {}, source[key]); // Recursive merge
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
};

export const useSettingsStore = create((set, get) => ({
  receiptConfig: DEFAULT_RECEIPT,
  systemConfig: DEFAULT_SYSTEM,
  isLoading: true,
  syncError: null,

  // --- 🛡️ SECURITY & VERIFICATION ---
  
  verifyPIN: (input) => {
    const stored = get().systemConfig?.ownerPIN;
    if (!stored) return true; 
    
    // Strict string coercion prevents integer-overflow or type-casting bypasses
    return String(input).trim() === String(stored);
  },

  setOwnerPIN: async (newPin) => {
    const pinStr = String(newPin).trim();
    if (!/^\d{6}$/.test(pinStr)) {
      return { success: false, error: "Security PIN must be exactly 6 digits." };
    }
    return await get().updateSystemConfig({ ownerPIN: pinStr });
  },

  // --- 🔄 SYNCHRONIZATION ENGINE ---

  subscribeToSettings: () => {
    if (get()._unsubReceipt || get()._unsubSystem) {
      get()._cleanup();
    }

    set({ isLoading: true, syncError: null });

    const receiptRef = doc(db, "settings", "receipt");
    const systemRef = doc(db, "settings", "system");

    const unsubReceipt = onSnapshot(receiptRef, 
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        set({ receiptConfig: secureDeepMerge(DEFAULT_RECEIPT, data), isLoading: false });
      },
      (err) => set({ syncError: err.message, isLoading: false })
    );

    const unsubSystem = onSnapshot(systemRef, 
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        set({ systemConfig: secureDeepMerge(DEFAULT_SYSTEM, data), isLoading: false });
      },
      (err) => set({ syncError: err.message, isLoading: false })
    );

    set({ _unsubReceipt: unsubReceipt, _unsubSystem: unsubSystem });
    return () => get()._cleanup();
  },

  _cleanup: () => {
    const { _unsubReceipt, _unsubSystem } = get();
    if (typeof _unsubReceipt === 'function') _unsubReceipt();
    if (typeof _unsubSystem === 'function') _unsubSystem();
    set({ _unsubReceipt: null, _unsubSystem: null });
  },

  // --- 📝 PERSISTENCE LAYER ---

  updateReceiptConfig: async (newConfig) => {
    try {
      const sanitized = { ...newConfig };
      // XSS Prevention: Strip HTML tags before hitting the DB
      ['storeName', 'address', 'footerMessage'].forEach(key => {
        if (sanitized[key]) {
          sanitized[key] = String(sanitized[key]).replace(/<[^>]*>?/gm, '').trim();
        }
      });

      await setDoc(doc(db, "settings", "receipt"), { ...sanitized, updatedAt: serverTimestamp() }, { merge: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: "Network Failure: Unable to save receipt settings." };
    }
  },

  updateSystemConfig: async (updates) => {
    try {
      await setDoc(doc(db, "settings", "system"), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: "Auth Failure: Unauthorized settings change." };
    }
  },


  toggleAutoPrint: async () => {
    const current = !!get().systemConfig?.autoPrint;
    return await get().updateSystemConfig({ autoPrint: !current });
  },

  toggleAutoLogout: async () => {
    const current = !!get().systemConfig?.autoLogout;
    return await get().updateSystemConfig({ autoLogout: !current });
  },

  toggleConfirmCompletion: async () => {
    const current = get().systemConfig?.confirmCompletion ?? true;
    return await get().updateSystemConfig({ confirmCompletion: !current });
  },

  toggleOrderTracking: async () => {
    const current = get().systemConfig?.enableOrderTracking ?? true;
    return await get().updateSystemConfig({ enableOrderTracking: !current });
  },

  setOperatingHours: async (config) => {
    if (!config || typeof config.isEnabled !== 'boolean') {
      return { success: false, error: "Malformed payload: operatingHours.isEnabled missing." };
    }
    return await get().updateSystemConfig({ operatingHours: config });
  }
}));