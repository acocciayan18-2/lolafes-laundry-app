import { create } from 'zustand';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, getDoc, setDoc, serverTimestamp
 } from 'firebase/firestore';

export const useCustomerStore = create((set, get) => ({
  customers: [],
  isLoading: true,
  error: null,

  // Real-time listener
  subscribeToCustomers: () => {
    set({ isLoading: true });
    
    // Order by created_at descending (newest first)
    const q = query(collection(db, "customers"), orderBy("created_at", "desc"));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const customersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        set({ customers: customersData, isLoading: false, error: null });
      },
      (error) => {
        console.error("Error fetching customers:", error);
        set({ error: error.message, isLoading: false });
      }
    );

    return unsubscribe; // Return the cleanup function
  },

 deleteCustomer: async (customerId) => {
  try {
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await getDoc(customerRef);

    if (customerSnap.exists()) {
      const customerData = customerSnap.data();

      // 1. Move to archived collection
      await setDoc(doc(db, "deleted_customers", customerId), {
        ...customerData,
        archivedAt: serverTimestamp(),
        status: 'archived'
      });

      // 2. Delete from active collection
      await deleteDoc(customerRef);
    }
  } catch (error) {
    console.error("Archive Error:", error);
    throw error; // Pass error to the component for the notification
  }
},
  
  // Basic checker for new orders
  checkPhoneExists: (phone) => {
    const { customers } = get();
    // Normalize phone (remove spaces/dashes) for comparison
    const cleanInput = phone.replace(/\D/g, "");
    return customers.some(c => {
        const cleanDb = (c.phone || "").replace(/\D/g, "");
        return cleanDb === cleanInput;
    });
  }
}));