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
    set({ isSubmitting: true });
    
    try {
      const name = customerData.name?.trim() || "";
      const phone = customerData.phone?.replace(/\D/g, '').slice(0, 11) || "";
      const address = customerData.address?.trim() || "";

      if (name.length < 2) {
        throw new Error("Customer name must be at least 2 characters.");
      }

      const docRef = await addDoc(collection(db, "customers"), {
        name,
        phone,
        address,
        loyalty_points: 0, 
        rewards_claimed: 0,
        created_at: serverTimestamp(),
      });
      
      return { id: docRef.id }; 
      
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

 submitOrder: async (orderPayload) => {
  set({ isSubmitting: true });
  
  try {
    // --- 1. STRICT LOGIC VALIDATIONS ---
    if (orderPayload.handover_method === 'delivery' && !orderPayload.customer_address?.trim()) {
      throw new Error("Delivery address is missing.");
    }
    if (orderPayload.is_paid && !orderPayload.payment_method) {
      throw new Error("Please select a payment method.");
    }
    if (!orderPayload.services || orderPayload.services.length === 0) {
      throw new Error("Cannot submit an empty order.");
    }

    const { loyaltySettings } = useLoyaltyStore.getState();
    const isLoyaltyActive = loyaltySettings?.is_enabled === true;
    const batch = writeBatch(db);
    
    // --- 2. SANITIZE DATA TYPES ---
    // Ensure these are numbers so Firestore doesn't save them as strings
    const totalAmount = Number(orderPayload.total_amount) || 0;
    const deliveryFee = Number(orderPayload.delivery_fee) || 0;
    const pointsToSpend = Number(orderPayload.loyalty_points_to_deduct) || 0;

    // ✨ IMPROVEMENT: Use the generated order_number as the Document ID 
    // This makes it much easier for the Cancellation Service to find this order later.
    const orderRef = doc(db, "orders", orderPayload.order_number);
    
    const orderData = {
      ...orderPayload,
      total_amount: totalAmount,
      delivery_fee: deliveryFee,
      loyalty_points_to_deduct: pointsToSpend, // This is the "Refund Key" for cancellation
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      status: 'pending', 
      payment_method: orderPayload.is_paid ? orderPayload.payment_method : null,
    };

    batch.set(orderRef, orderData);

    // --- 3. CUSTOMER STATS & LOYALTY ---
    if (orderPayload.customer_id) {
      const customerRef = doc(db, "customers", orderPayload.customer_id);
      const rewardsUsedCount = orderPayload.services.filter(s => s.is_reward).length;
      
      /**
       * LOYALTY MATH:
       * If they spend 10 points for a reward, they don't EARN a point for this order.
       * pointsEarned = 0 if spending, 1 if regular order.
       */
      const pointsEarned = (isLoyaltyActive && pointsToSpend <= 0) ? 1 : 0; 
      const netPointsChange = pointsEarned - pointsToSpend; 

      const customerUpdates = {
        rewards_claimed: increment(rewardsUsedCount), 
        // This actually reduces the balance in the DB right now
        loyalty_points: increment(netPointsChange), 
        last_order_at: serverTimestamp(),
      };

      if (orderPayload.customer_name?.trim()) customerUpdates.name = orderPayload.customer_name.trim();
      if (orderPayload.customer_phone?.trim()) customerUpdates.phone = orderPayload.customer_phone.trim();
      if (orderPayload.customer_address?.trim()) customerUpdates.address = orderPayload.customer_address.trim();

      batch.update(customerRef, customerUpdates);
    }

    await batch.commit();

    // --- 4. LOG ACTIVITY ---
    useActivityStore.getState().logActivity(
      { ...orderData },
      'pending',
      { 
        action: 'created', 
        label: `Order #${orderPayload.order_number} Created. Points: ${pointsToSpend > 0 ? '-' + pointsToSpend : '+1'}` 
      }
    );

    return orderPayload.order_number;
    
  } catch (error) {
    console.error("Order Submission Error:", error);
    throw error;
  } finally {
    set({ isSubmitting: false });
  }
}
}));