import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

export const useOrderStore = create((set) => ({
  orders: [],
  isLoading: true,
  error: null,

  // Subscribe to real-time updates
  subscribeToOrders: () => {
    set({ isLoading: true });
    
    // We query the orders collection. 
    // All display data (name, phone) is already inside the snapshot!
    const q = query(collection(db, "orders"), orderBy("created_at", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        
        return {
          id: docSnap.id,
          ...data,
          // Handle cases where customer_name might be missing in old test data
          customer_name: data.customer_name || "Unknown Customer",
          customer_phone: data.customer_phone || "N/A",
          
          // Ensure created_date exists for your OrderCard filter logic
          created_date: data.created_at?.toDate().toISOString() || new Date().toISOString()
        };
      });
      
      set({ orders: ordersList, isLoading: false });
    }, (err) => {
      console.error("Firestore Subscription Error:", err);
      set({ error: err.message, isLoading: false });
    });

    return unsubscribe;
  },

  // Update Status logic
  updateOrderStatus: async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      
      const updateData = { 
        status: newStatus,
        updated_at: serverTimestamp() 
      };

      // BUSINESS LOGIC: If an order is picked up, it should usually be marked as paid
      if (newStatus === 'picked_up') {
        updateData.completed_at = serverTimestamp();
        updateData.is_paid = true; 
      }

      await updateDoc(orderRef, updateData);
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }
  },

  // Update Payment Status
  togglePaymentStatus: async (orderId, currentStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { 
        is_paid: !currentStatus,
        payment_updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating payment:", error);
      throw error;
    }
  }
}));