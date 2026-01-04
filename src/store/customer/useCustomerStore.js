import { create } from 'zustand';
import { db } from '../../services/firebase'; 
import { collection, onSnapshot, query, orderBy, getDocs, where} from 'firebase/firestore';

export const useCustomerStore = create((set, get) => ({
  customers: [],
  isLoading: true,

  // Real-time listener for the customer database
  subscribeToCustomers: () => {
    const q = query(collection(db, "customers"), orderBy("name", "asc"));
    
    return onSnapshot(q, (snapshot) => {
      const customerData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      set({ customers: customerData, isLoading: false });
    }, (error) => {
      console.error("Firebase Customer Subscription Error:", error);
      set({ isLoading: false });
    });
  },

  checkPhoneExists: (phoneNumber) => {
    if (!phoneNumber || phoneNumber.length < 4) return false;
    const cleanInput = String(phoneNumber).replace(/\D/g, "");
    
    return get().customers.some(c => {
      const cleanDb = String(c.phone || "").replace(/\D/g, "");
      return cleanDb === cleanInput;
    });
  }
}));