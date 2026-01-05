import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, 
  doc, 
  addDoc,
  writeBatch, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';

export const useNewOrderStore = create((set) => ({
  isSubmitting: false,

  createCustomer: async (customerData) => {
    try {
      const docRef = await addDoc(collection(db, "customers"), {
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address || "",
        order_count: 0, 
        loyalty_points: 0, 
        rewards_claimed: 0,
        created_at: serverTimestamp(),
      });
      return { id: docRef.id }; 
    } catch (error) {
      console.error("Error creating customer:", error);
      throw new Error("Failed to create customer profile.");
    }
  },

  submitOrder: async (orderPayload) => {
    set({ isSubmitting: true });
    const batch = writeBatch(db);
    
    try {
      // 1. Create Order
      const orderRef = doc(collection(db, "orders"));
      
      batch.set(orderRef, {
        ...orderPayload, // Spreads customer info, loyalty_points_to_deduct, etc.
        created_at: serverTimestamp(),
        status: 'pending',
      });

      // 2. Update Customer Counters
      if (orderPayload.customer_id) {
        const customerRef = doc(db, "customers", orderPayload.customer_id);
        
        const rewardsUsedCount = orderPayload.services.filter(s => s.is_reward).length;
        const pointsToSpend = orderPayload.loyalty_points_to_deduct || 0; 
        
        // --- LOGIC: CONDITIONAL EARNING ---
        // If spending points (redeeming), earn 0 points.
        // If NOT spending points (regular order), earn 1 point.
        const pointsEarned = pointsToSpend > 0 ? 0 : 1; 

        // Net Change logic:
        // Redemption: 0 - 10 = -10
        // Regular:    1 - 0  = +1
        const netPointsChange = pointsEarned - pointsToSpend; 

        batch.update(customerRef, {
          order_count: increment(1), // Always track lifetime stats
          rewards_claimed: increment(rewardsUsedCount), 
          loyalty_points: increment(netPointsChange), // Apply strict math
          
          last_order_at: serverTimestamp(),
          name: orderPayload.customer_name,
          phone: orderPayload.customer_phone,
          address: orderPayload.customer_address
        });
      }

      await batch.commit();
      set({ isSubmitting: false });
      return orderRef.id;
      
    } catch (error) {
      console.error("Order Submission Error:", error);
      set({ isSubmitting: false });
      throw error;
    }
  }
}));