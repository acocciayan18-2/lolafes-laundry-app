import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteField, 
  collection, 
  getDocs, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';

// ==========================================
// HELPER: BATCH CHUNKING (Prevents Firebase 500 Limit Crash)
// ==========================================
const chunkArray = (array, size) => {
  const chunked = [];
  let index = 0;
  while (index < array.length) {
    chunked.push(array.slice(index, size + index));
    index += size;
  }
  return chunked;
};

export const useLoyaltyStore = create((set, get) => ({
  loyaltySettings: {
    is_enabled: false,
    orders_required: 10,
    free_service_type: "wash_dry",
  },
  isLoading: true,

  subscribeToLoyalty: () => {
    set({ isLoading: true });
    const loyaltyDoc = doc(db, "coupon", "loyalty"); 
    
    return onSnapshot(loyaltyDoc, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const { free_service_kg, ...cleanData } = data;
        
        // SECURITY: Ensure data comes down in the exact types the frontend expects
        set({ 
          loyaltySettings: {
            is_enabled: Boolean(cleanData.is_enabled),
            orders_required: Math.max(1, Number(cleanData.orders_required) || 10),
            free_service_type: String(cleanData.free_service_type || "wash_dry").trim()
          }, 
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    }, (error) => {
      console.error("Firebase Loyalty Error:", error);
      set({ isLoading: false });
    });
  },

  saveLoyaltySettings: async (newSettings, shouldWipePoints = false) => {
    // 1. DATA SANITIZATION
    // Never trust frontend components blindly. Force strict types before saving to Firebase.
    const sanitizedSettings = {
      is_enabled: Boolean(newSettings.is_enabled),
      orders_required: Math.max(1, Number(newSettings.orders_required) || 10),
      free_service_type: String(newSettings.free_service_type || "wash_dry").trim()
    };

    // 2. OPTIMISTIC UI UPDATE
    // Make the UI feel instant while Firebase works in the background
    const previousSettings = get().loyaltySettings;
    set({ loyaltySettings: sanitizedSettings });

    try {
      const loyaltyDoc = doc(db, "coupon", "loyalty");
      
      // 3. Update the Promo Status
      await setDoc(loyaltyDoc, {
        ...sanitizedSettings,
        free_service_kg: deleteField() // Clean up legacy fields
      }, { merge: true });

      // 4. HIGH-PERFORMANCE POINTS RESET
      if (shouldWipePoints) {
        const customersRef = collection(db, "customers");
        
        // OPTIMIZATION: Only fetch customers that ACTUALLY have points. 
        // This saves massive amounts of bandwidth and Firebase read limits.
        const q = query(customersRef, where("loyalty_points", ">", 0));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const allDocs = snapshot.docs;
          
          // SAFETY FIX: Firebase writeBatches crash if they exceed 500 operations.
          // We chunk them into safe limits (490) just to be perfectly safe.
          const batches = chunkArray(allDocs, 490);

          for (const batchDocs of batches) {
            const batch = writeBatch(db);
            batchDocs.forEach((d) => {
              batch.update(d.ref, { loyalty_points: 0 });
            });
            await batch.commit(); // Wait for this chunk to finish before doing the next
          }
          
          console.log(`Successfully reset points for ${allDocs.length} customers.`);
        }
      }
    } catch (error) {
      console.error("Error updating loyalty settings:", error);
      // ROLLBACK: If it failed, revert the Optimistic UI update
      set({ loyaltySettings: previousSettings });
      
      // Throw a clean error for the UI to display in the toast notification
      throw new Error("Network error. Failed to save configurations.");
    }
  }
}));