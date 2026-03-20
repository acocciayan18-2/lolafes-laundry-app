import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  getDoc, serverTimestamp, updateDoc, writeBatch
} from 'firebase/firestore';

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const ALLOWED_UPDATE_FIELDS = Object.freeze(['name', 'phone', 'address', 'notes']);
const MAX_STRING_LENGTH = 250;

// ==========================================
// UTILITY HELPERS
// ==========================================

/**
 * @description Secures and sanitizes the update payload to prevent NoSQL injection, 
 * prototype pollution, and unauthorized field modifications (e.g., loyalty_points).
 * @param {Object} data - Raw input data
 * @returns {Object} Sanitized data payload
 */
const sanitizeCustomerPayload = (data) => {
  if (!data || typeof data !== 'object') return {};
  
  return Object.keys(data).reduce((acc, key) => {
    if (ALLOWED_UPDATE_FIELDS.includes(key)) {
      const val = data[key];
      if (typeof val === 'string') {
        // Strip basic HTML tags and strictly cap length
        acc[key] = val.replace(/[<>]/g, '').trim().substring(0, MAX_STRING_LENGTH);
      } else {
        acc[key] = val;
      }
    }
    return acc;
  }, {});
};

// ==========================================
// OOP DATA LAYER: CUSTOM ERROR CLASSES
// ==========================================
class StoreError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "StoreError";
    this.code = code;
  }
}

// ==========================================
// THE STORE
// ==========================================
export const useCustomerStore = create((set, get) => ({
  // --- STATE ---
  customers: [],
  isLoading: true,
  error: null,
  
  // Track active subscription to prevent memory leaks
  _unsubscribe: null, 

  // --- 📡 SUBSCRIPTIONS (READ) ---
  subscribeToCustomers: () => {
    const currentUnsub = get()._unsubscribe;
    if (currentUnsub) currentUnsub(); // Prevent duplicate listeners

    set({ isLoading: true, error: null });
    
    try {
      const q = query(collection(db, "customers"), orderBy("created_at", "desc"));

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const customersData = [];
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data) {
              customersData.push({
                id: docSnap.id,
                ...data,
                // Ensure phone is always a clean string in local state for O(1) matching later
                cleanPhone: typeof data.phone === 'string' ? data.phone.replace(/\D/g, "") : ""
              });
            }
          });
          set({ customers: customersData, isLoading: false, error: null });
        },
        (error) => {
          console.error("[CustomerStore] Subscription Error:", error);
          set({ error: error?.message || "Failed to sync customers.", isLoading: false });
        }
      );

      set({ _unsubscribe: unsubscribe });
      return unsubscribe;
    } catch (error) {
      console.error("[CustomerStore] Init Error:", error);
      set({ error: "Failed to initialize customer sync.", isLoading: false });
      return () => {};
    }
  },

  // --- ✍️ MUTATIONS (WRITE) ---
  
  updateCustomer: async (customerId, data) => {
    if (!customerId || typeof customerId !== 'string') {
      throw new StoreError("Invalid customer identifier.", "INVALID_ID");
    }

    const sanitizedData = sanitizeCustomerPayload(data);
    
    if (Object.keys(sanitizedData).length === 0) {
      throw new StoreError("No valid fields provided for update.", "EMPTY_PAYLOAD");
    }

    try {
      const customerRef = doc(db, "customers", customerId);
      await updateDoc(customerRef, {
        ...sanitizedData,
        updated_at: serverTimestamp() 
      });
    } catch (error) {
      console.error("[CustomerStore] Update Error:", error);
      throw new StoreError(error?.message || "Database failed to update customer.", "DB_UPDATE_FAIL");
    }
  },

  /**
   * @description Atomically archives and removes a customer.
   * ⚠️ ARCHITECTURAL NOTE: FRONTEND VS BACKEND
   * The frontend orchestrates this move, but the Backend (Firestore Rules) MUST explicitly 
   * verify the user has Admin/Manager privileges before allowing delete operations on the `customers` collection.
   */
  deleteCustomer: async (customerId) => {
    if (!customerId || typeof customerId !== 'string') {
      throw new StoreError("Invalid customer identifier.", "INVALID_ID");
    }

    try {
      const customerRef = doc(db, "customers", customerId);
      const customerSnap = await getDoc(customerRef);

      if (!customerSnap.exists()) {
        throw new StoreError("Customer does not exist or was already deleted.", "NOT_FOUND");
      }

      const customerData = customerSnap.data();
      const archiveRef = doc(db, "deleted_customers", customerId);

      // ✨ QA FIX: Atomic Batch Operation
      // Guarantees that either BOTH the archive and delete succeed, or NEITHER do.
      const batch = writeBatch(db);

      batch.set(archiveRef, {
        ...customerData,
        archivedAt: serverTimestamp(),
        status: 'archived'
      });

      batch.delete(customerRef);

      await batch.commit();
      
    } catch (error) {
      console.error("[CustomerStore] Archive Error:", error);
      throw new StoreError(error?.message || "Failed to archive and delete customer.", "DB_BATCH_FAIL");
    }
  },
  
  /**
   * @description Checks if a phone number already exists in the local state.
   * ⚠️ ARCHITECTURAL NOTE: FRONTEND VS BACKEND
   * This is for fast UI/UX feedback (e.g., showing a red border on an input).
   * To prevent true duplicates resulting from race conditions (two cashiers adding the same 
   * customer simultaneously), the Backend MUST enforce a unique constraint on the `phone` field.
   */
  checkPhoneExists: (phone, excludeCustomerId = null) => {
    if (!phone || typeof phone !== 'string') return false;
    
    const { customers } = get();
    // O(1) formatting before the loop
    const cleanInput = phone.replace(/\D/g, "");
    if (!cleanInput) return false;

    // O(N) lookup, but utilizing pre-cleaned data from the snapshot
    return customers.some(c => c.cleanPhone === cleanInput && c.id !== excludeCustomerId);
  }
}));