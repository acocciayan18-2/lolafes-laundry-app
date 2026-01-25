import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp, 
  increment, 
  addDoc 
} from 'firebase/firestore';
import { useActivityStore } from '../activities/useActivityStore';

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
      // 1. Prepare Order Data
      const orderRef = doc(collection(db, "orders"));
      const orderData = {
        ...orderPayload,
        created_at: serverTimestamp(),
        status: 'pending', // Use lowercase for consistent logic checks
      };

      // 2. Set the Order in Firestore
      batch.set(orderRef, orderData);

      // 3. Update Customer Stats if customer exists
      if (orderPayload.customer_id) {
        const customerRef = doc(db, "customers", orderPayload.customer_id);
        
        // Calculate loyalty adjustments
        const rewardsUsedCount = orderPayload.services.filter(s => s.is_reward).length;
        const pointsToSpend = orderPayload.loyalty_points_to_deduct || 0; 
        const pointsEarned = pointsToSpend > 0 ? 0 : 1; 
        const netPointsChange = pointsEarned - pointsToSpend; 

        batch.update(customerRef, {
          order_count: increment(1),
          rewards_claimed: increment(rewardsUsedCount), 
          loyalty_points: increment(netPointsChange),
          last_order_at: serverTimestamp(),
          name: orderPayload.customer_name,
          phone: orderPayload.customer_phone,
          address: orderPayload.customer_address
        });
      }

      // 4. Commit to Firebase
      await batch.commit();

      // 5. Explicitly Log Activity
      // We pass 'created' and 'ORDER CREATED' to ensure the Activity Feed identifies this correctly.
      useActivityStore.getState().logActivity(
        { 
          ...orderData, 
          order_number: orderPayload.order_number,
          customer_name: orderPayload.customer_name 
        },
        'pending',
        { action: 'created', label: 'ORDER CREATED' }
      );

      set({ isSubmitting: false });
      return orderRef.id;
      
    } catch (error) {
      console.error("Order Submission Error:", error);
      set({ isSubmitting: false });
      throw error;
    }
  }
}));