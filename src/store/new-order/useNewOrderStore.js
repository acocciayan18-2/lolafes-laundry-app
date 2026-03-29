/**
 * @file useNewOrderStore.js
 * @description Enterprise Order Submission & Customer Creation Store.
 * Implements strict input sanitization, double-submit prevention, and atomic batching.
 * Fully supports Anonymous "Walk-In" Guest checkout flows.
 */

import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, doc, writeBatch, serverTimestamp, 
  increment, addDoc 
} from 'firebase/firestore';
import { useActivityStore } from '../activities/useActivityStore';
import { useLoyaltyStore } from '../services/useLoyaltyStore';

// ==========================================
// PURE UTILITIES & DEFENSIVE PROGRAMMING
// ==========================================

/**
 * @description Strips HTML tags to prevent Stored XSS attacks.
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return "";
  return str.replace(/[<>]/g, '').trim();
};

/**
 * @description Validates and formats Philippine phone numbers.
 */
const sanitizePhone = (phone) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length <= 11 ? cleaned : cleaned.slice(0, 11);
};

/**
 * @description Validates the order payload against business rules.
 * @throws {Error} If validation fails.
 */
const validateOrderPayload = (payload) => {
  // ✨ FIX: Address Validation (Walk-Ins cannot request delivery without an address)
  if (payload.handover_method === 'delivery' && !payload.customer_address?.trim()) {
    throw new Error("Validation Error: Delivery address is strictly required for deliveries.");
  }
  
  if (payload.is_paid && !payload.payment_method) {
    throw new Error("Validation Error: Paid orders require a specified payment method.");
  }
  if (!Array.isArray(payload.services) || payload.services.length === 0) {
    throw new Error("Validation Error: Cannot process an empty order.");
  }
  if (!payload.order_number) {
    throw new Error("System Error: Missing tracking Order Number.");
  }

  // ✨ FIX: Walk-In Constraints Validation
  if (payload.is_walk_in && payload.loyalty_points_to_deduct > 0) {
    throw new Error("Security Violation: Anonymous Walk-In guests cannot redeem loyalty points.");
  }
};

// ==========================================
// CORE STORE
// ==========================================

export const useNewOrderStore = create((set, get) => ({
  isSubmitting: false,

  createCustomer: async (customerData) => {
    // 🛡️ QA: Prevent Double-Submit Race Conditions
    if (get().isSubmitting) return null;
    
    set({ isSubmitting: true });
    
    try {
      // 🛡️ SECURITY: Strict Sanitization
      const name = sanitizeString(customerData.name);
      const phone = sanitizePhone(customerData.phone);
      const address = sanitizeString(customerData.address);

      if (name.length < 2) {
        throw new Error("Customer name must be at least 2 characters.");
      }
      
      // ✨ FIX: Reject empty phone numbers ONLY if they are not explicitly flagged as walk-ins
      // (Though theoretically, createCustomer shouldn't be called for a walk-in anyway)
      if (!customerData.is_walk_in && phone.length < 11) {
          throw new Error("A valid 11-digit phone number is required to register a new customer.");
      }

      const newCustomer = {
        name,
        phone,
        address,
        loyalty_points: 0, 
        rewards_claimed: 0,
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "customers"), newCustomer);
      return { id: docRef.id, ...newCustomer }; 
      
    } catch (error) {
      console.error("[Customer Creation Exception]:", error);
      throw error; // Propagate to UI for A11y alert announcements
    } finally {
      set({ isSubmitting: false });
    }
  },

  submitOrder: async (orderPayload) => {
    // 🛡️ QA: Mutex Lock against multiple fast clicks
    if (get().isSubmitting) return null;
    
    set({ isSubmitting: true });
    
    try {
      // 1. STRICT LOGIC VALIDATIONS
      validateOrderPayload(orderPayload);

      const { loyaltySettings } = useLoyaltyStore.getState();
      const isLoyaltyActive = loyaltySettings?.is_enabled === true;
      const batch = writeBatch(db);
      
      // 2. SANITIZE & COERCE DATA TYPES
      const totalAmount = Number(orderPayload.total_amount) || 0;
      const deliveryFee = Number(orderPayload.delivery_fee) || 0;
      const pointsToSpend = Number(orderPayload.loyalty_points_to_deduct) || 0;
      const isWalkIn = Boolean(orderPayload.is_walk_in);
      
      const sanitizedServices = orderPayload.services.map(service => ({
        ...service,
        service_name: sanitizeString(service.service_name),
        subtotal: Number(service.subtotal) || 0
      }));

      const orderRef = doc(db, "orders", orderPayload.order_number);
      
      const orderData = {
        ...orderPayload,
        customer_name: sanitizeString(orderPayload.customer_name) || (isWalkIn ? "Walk-In Guest" : "Unknown"),
        // ✨ FIX: Allow empty phone for walk-ins
        customer_phone: isWalkIn ? "" : sanitizePhone(orderPayload.customer_phone),
        customer_address: sanitizeString(orderPayload.customer_address),
        special_instructions: sanitizeString(orderPayload.special_instructions),
        services: sanitizedServices,
        total_amount: totalAmount,
        delivery_fee: deliveryFee,
        loyalty_points_to_deduct: pointsToSpend, 
        is_walk_in: isWalkIn, // Flag it in the database for analytics
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        status: 'pending', 
        payment_method: orderPayload.is_paid ? sanitizeString(orderPayload.payment_method) : null,
      };

      batch.set(orderRef, orderData);

      // 3. CUSTOMER STATS & LOYALTY (Atomic Batching)
      // ✨ QA FIX: We completely skip this entire block if it's a Walk-In guest.
      let netPointsChange = 0;

      if (!isWalkIn && orderPayload.customer_id) {
        const customerRef = doc(db, "customers", orderPayload.customer_id);
        const rewardsUsedCount = sanitizedServices.filter(s => s.is_reward).length;
        
        const pointsEarned = (isLoyaltyActive && pointsToSpend <= 0) ? 1 : 0; 
        netPointsChange = pointsEarned - pointsToSpend; 

        const customerUpdates = {
          rewards_claimed: increment(rewardsUsedCount), 
          loyalty_points: increment(netPointsChange), 
          last_order_at: serverTimestamp(),
        };

        // Sync latest customer contact info defensively
        if (orderData.customer_name) customerUpdates.name = orderData.customer_name;
        if (orderData.customer_phone) customerUpdates.phone = orderData.customer_phone;
        if (orderData.customer_address) customerUpdates.address = orderData.customer_address;

        batch.update(customerRef, customerUpdates);
      }

      await batch.commit();

      // 4. NON-BLOCKING ACTIVITY LOGGING
      Promise.resolve().then(() => {
        useActivityStore.getState().logActivity(
          { ...orderData },
          'pending',
          { 
            action: 'created', 
            label: isWalkIn 
              ? `Walk-In Order #${orderPayload.order_number} Created.`
              : `Order #${orderPayload.order_number} Created. Points: ${pointsToSpend > 0 ? '-' + pointsToSpend : '+1'}` 
          }
        );
      }).catch(err => console.error("Non-fatal: Failed to log activity", err));

      return orderPayload.order_number;
      
    } catch (error) {
      console.error("[Order Submission Exception]:", error);
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  }
}));