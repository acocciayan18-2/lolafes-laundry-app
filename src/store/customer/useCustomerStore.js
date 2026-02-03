import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  deleteDoc, getDoc, setDoc, serverTimestamp, updateDoc // Added updateDoc
} from 'firebase/firestore';

export const useCustomerStore = create((set, get) => ({
  customers: [],
  isLoading: true,
  error: null,

  // Real-time listener
  subscribeToCustomers: () => {
    set({ isLoading: true });
    
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

    return unsubscribe;
  },

  // --- NEW UPDATE METHOD ---
  updateCustomer: async (customerId, data) => {
    try {
      const customerRef = doc(db, "customers", customerId);
      await updateDoc(customerRef, {
        ...data,
        updated_at: serverTimestamp() // Tracks when the info was last changed
      });
    } catch (error) {
      console.error("Update Error:", error);
      throw error;
    }
  },

  deleteCustomer: async (customerId) => {
    try {
      const customerRef = doc(db, "customers", customerId);
      const customerSnap = await getDoc(customerRef);

      if (customerSnap.exists()) {
        const customerData = customerSnap.data();

        await setDoc(doc(db, "deleted_customers", customerId), {
          ...customerData,
          archivedAt: serverTimestamp(),
          status: 'archived'
        });

        await deleteDoc(customerRef);
      }
    } catch (error) {
      console.error("Archive Error:", error);
      throw error;
    }
  },
  
  checkPhoneExists: (phone) => {
    const { customers } = get();
    const cleanInput = phone.replace(/\D/g, "");
    return customers.some(c => {
        const cleanDb = (c.phone || "").replace(/\D/g, "");
        return cleanDb === cleanInput;
    });
  }
}));