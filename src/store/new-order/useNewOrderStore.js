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
import { useLoyaltyStore } from '../services/useLoyaltyStore';

export const useNewOrderStore = create((set) => ({
  isSubmitting: false,

  createCustomer: async (customerData) => {
    // 1. STATE SAFETY: Ensure loading state covers the entire operation
    set({ isSubmitting: true });
    
    try {
      // 2. SANITIZATION: Clean inputs before hitting the database
      const name = customerData.name?.trim() || "";
      const phone = customerData.phone?.replace(/\D/g, '').slice(0, 11) || "";
      const address = customerData.address?.trim() || "";

      // 3. VALIDATION: Prevent empty profiles
      if (name.length < 2) {
        throw new Error("Customer name must be at least 2 characters.");
      }

      const docRef = await addDoc(collection(db, "customers"), {
        name,
        phone,
        address,
        order_count: 0, 
        loyalty_points: 0, 
        rewards_claimed: 0,
        created_at: serverTimestamp(),
      });
      
      return { id: docRef.id }; 
      
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error; // Re-throw so the frontend UI can catch it and show a toast
    } finally {
      // Guaranteed to unlock the UI button even if the network fails
      set({ isSubmitting: false });
    }
  },

  submitOrder: async (orderPayload) => {
    set({ isSubmitting: true });
    
    try {
      // 4. STRICT PAYLOAD VALIDATION
      if (!orderPayload.services || orderPayload.services.length === 0) {
        throw new Error("Cannot submit an empty order. Please add services.");
      }
      if (!orderPayload.customer_name || !orderPayload.order_number) {
        throw new Error("System Error: Missing customer name or order number.");
      }

      const { loyaltySettings } = useLoyaltyStore.getState();
      const isLoyaltyActive = loyaltySettings?.is_enabled === true;

      const batch = writeBatch(db);
      
      // 5. SANITIZE FINANCIALS: Force strict Number types to prevent NaN/String bugs
      const totalAmount = Number(orderPayload.total_amount) || 0;
      const deliveryFee = Number(orderPayload.delivery_fee) || 0;
      const pointsToSpend = Number(orderPayload.loyalty_points_to_deduct) || 0;

      // Prepare Order Data
      const orderRef = doc(collection(db, "orders"));
      const orderData = {
        ...orderPayload,
        total_amount: totalAmount,
        delivery_fee: deliveryFee,
        loyalty_points_to_deduct: pointsToSpend,
        created_at: serverTimestamp(),
        status: 'pending', 
      };

      // Set the Order in Firestore
      batch.set(orderRef, orderData);

      // Update Customer Stats if customer exists
      if (orderPayload.customer_id) {
        const customerRef = doc(db, "customers", orderPayload.customer_id);
        
        // --- LOYALTY LOGIC ---
        const rewardsUsedCount = orderPayload.services.filter(s => s.is_reward).length;
        
        // Earn 1 point ONLY if the program is active AND no points are being spent today
        const pointsEarned = (isLoyaltyActive && pointsToSpend <= 0) ? 1 : 0; 
        const netPointsChange = pointsEarned - pointsToSpend; 

        // 6. SAFE CUSTOMER UPDATE: 
        // We only update name/phone/address if they actually exist in the payload.
        // This prevents accidentally overwriting a saved phone number with a blank string.
        const customerUpdates = {
          order_count: increment(1),
          rewards_claimed: increment(rewardsUsedCount), 
          loyalty_points: increment(netPointsChange),
          last_order_at: serverTimestamp(),
        };

        if (orderPayload.customer_name?.trim()) customerUpdates.name = orderPayload.customer_name.trim();
        if (orderPayload.customer_phone?.trim()) customerUpdates.phone = orderPayload.customer_phone.trim();
        if (orderPayload.customer_address?.trim()) customerUpdates.address = orderPayload.customer_address.trim();

        batch.update(customerRef, customerUpdates);
      }

      // Commit to Firebase
      await batch.commit();

      // Explicitly Log Activity
      useActivityStore.getState().logActivity(
        { 
          ...orderData, 
          order_number: orderPayload.order_number,
          customer_name: orderPayload.customer_name 
        },
        'pending',
        { action: 'created', label: 'ORDER CREATED' }
      );

      return orderRef.id;
      
    } catch (error) {
      console.error("Order Submission Error:", error);
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  }
}));