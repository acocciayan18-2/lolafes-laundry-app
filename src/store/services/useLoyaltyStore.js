import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteField, 
  collection, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';

export const useLoyaltyStore = create((set) => ({
  loyaltySettings: {
    is_enabled: false,
    orders_required: 10,
    free_service_type: "wash_dry",
  },
  isLoading: true,

  subscribeToLoyalty: () => {
    const loyaltyDoc = doc(db, "coupon", "loyalty"); 
    
    return onSnapshot(loyaltyDoc, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const { free_service_kg, ...cleanData } = data;
        set({ loyaltySettings: cleanData, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }, (error) => {
      console.error("Firebase Loyalty Error:", error);
      set({ isLoading: false });
    });
  },

 // store/services/useLoyaltyStore.js

saveLoyaltySettings: async (newSettings, shouldWipePoints = false) => {
  try {
    const loyaltyDoc = doc(db, "coupon", "loyalty");
    const { free_service_kg, ...cleanSettings } = newSettings;
    
    // 1. Update the Promo Status (Enabled/Disabled)
    await setDoc(loyaltyDoc, {
      ...cleanSettings,
      free_service_kg: deleteField() 
    }, { merge: true });

    // 2. ONLY wipe points if specifically requested
    if (shouldWipePoints) {
      const customersRef = collection(db, "customers");
      const snapshot = await getDocs(customersRef);
      const batch = writeBatch(db);
      
      let operationCount = 0;
      snapshot.docs.forEach((doc) => {
        if (doc.data().loyalty_points > 0) {
          batch.update(doc.ref, { loyalty_points: 0 });
          operationCount++;
        }
      });

      if (operationCount > 0) {
        await batch.commit();
        console.log(`Reset points for ${operationCount} customers.`);
      }
    }
  } catch (error) {
    console.error("Error updating loyalty settings:", error);
    throw error;
  }
}
}));