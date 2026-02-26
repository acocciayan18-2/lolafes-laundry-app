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
<<<<<<< HEAD
=======
import { useLoyaltyStore } from '../services/useLoyaltyStore'; // 1. Import Loyalty Store
>>>>>>> Karen2.0

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
<<<<<<< HEAD
=======
    
    // 2. GET CURRENT LOYALTY STATUS
    const { loyaltySettings } = useLoyaltyStore.getState();
    const isLoyaltyActive = loyaltySettings?.is_enabled === true;

>>>>>>> Karen2.0
    const batch = writeBatch(db);
    
    try {
      // 1. Prepare Order Data
      const orderRef = doc(collection(db, "orders"));
      const orderData = {
        ...orderPayload,
        created_at: serverTimestamp(),
<<<<<<< HEAD
        status: 'pending', // Use lowercase for consistent logic checks
=======
        status: 'pending', 
>>>>>>> Karen2.0
      };

      // 2. Set the Order in Firestore
      batch.set(orderRef, orderData);

      // 3. Update Customer Stats if customer exists
      if (orderPayload.customer_id) {
        const customerRef = doc(db, "customers", orderPayload.customer_id);
        
<<<<<<< HEAD
        // Calculate loyalty adjustments
        const rewardsUsedCount = orderPayload.services.filter(s => s.is_reward).length;
        const pointsToSpend = orderPayload.loyalty_points_to_deduct || 0; 
        const pointsEarned = pointsToSpend > 0 ? 0 : 1; 
=======
        // --- LOYALTY LOGIC WITH INACTIVE CHECK ---
        const rewardsUsedCount = orderPayload.services.filter(s => s.is_reward).length;
        const pointsToSpend = orderPayload.loyalty_points_to_deduct || 0; 
        
        // Only earn 1 point if the program is active and no points are being spent
        const pointsEarned = (isLoyaltyActive && pointsToSpend <= 0) ? 1 : 0; 
        
        // Calculation: (Points Earned) - (Points Spent)
        // If inactive, pointsEarned is always 0.
>>>>>>> Karen2.0
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
<<<<<<< HEAD
      // We pass 'created' and 'ORDER CREATED' to ensure the Activity Feed identifies this correctly.
=======
>>>>>>> Karen2.0
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