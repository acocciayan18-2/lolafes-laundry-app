import { create } from 'zustand';
import { db } from '../../services/firebase'; 
import { 
  collection, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, query, orderBy, where, getDocs
} from 'firebase/firestore';

export const useServiceStore = create((set, get) => ({
  services: [],
  isLoading: true,

  subscribeToServices: () => {
    const q = query(collection(db, "services"), orderBy("name", "asc"));
    
    return onSnapshot(q, (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      set({ services: servicesData, isLoading: false });
    }, async (error) => {
      console.error("Firebase Subscription Error:", error);
      const { useNotificationStore } = await import("../ui/useNotificationStore");
      useNotificationStore.getState().showNotification("Connection lost. Retrying...", "error");
      set({ isLoading: false });
    });
  },

  addService: async (serviceData) => {
    const { useNotificationStore } = await import("../ui/useNotificationStore"); 
    const { showNotification } = useNotificationStore.getState();
    try {
      await addDoc(collection(db, "services"), serviceData);
      showNotification(`${serviceData.name} added successfully!`, "success");
      return true;
    } catch (error) {
      showNotification("Failed to add service.", "error");
      return false;
    }
  },

  updateService: async (id, updatedData) => {
    const { useNotificationStore } = await import("../ui/useNotificationStore"); 
    const { useLoyaltyStore } = await import("./useLoyaltyStore");

    const { showNotification } = useNotificationStore.getState();
    const loyaltySettings = useLoyaltyStore.getState().loyaltySettings;

    const currentService = get().services.find(s => s.id === id);
    if (!currentService) return false;

    try {
      // 1. DISABLING CHECK
      if (currentService.is_active && updatedData.is_active === false) {
        if (loyaltySettings?.is_enabled && loyaltySettings.free_service_type === currentService.name) {
          showNotification(`Cannot disable: "${currentService.name}" is the Loyalty Reward.`, "error");
          return false;
        }

        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("status", "not-in", ["completed", "picked_up"]));
        const snapshot = await getDocs(q);
        const inUse = snapshot.docs.some(d => d.data().services?.some(s => s.id === id));
        
        if (inUse) {
          showNotification("Cannot disable: Service is currently in use by active orders.", "error");
          return false;
        }
      }

      // 2. RENAME CHECK
      if (updatedData.name && updatedData.name !== currentService.name) {
         if (loyaltySettings?.is_enabled && loyaltySettings.free_service_type === currentService.name) {
            showNotification("Cannot rename: Update Loyalty Settings reward first.", "error");
            return false;
         }
      }

      // 3. EXECUTE UPDATE
      const serviceRef = doc(db, "services", id);
      await updateDoc(serviceRef, updatedData);
      
      if (Object.keys(updatedData).length > 1) {
        showNotification("Service updated successfully", "success");
      }
      return true;

    } catch (error) {
      console.error("Database Error:", error);
      showNotification("Failed to sync with cloud", "error");
      return false;
    }
  },

  deleteServiceSafe: async (serviceId, serviceData) => {
    const { useLoyaltyStore } = await import("./useLoyaltyStore");
    const { useNotificationStore } = await import("../ui/useNotificationStore"); 

    const { showNotification } = useNotificationStore.getState();
    const loyaltySettings = useLoyaltyStore.getState().loyaltySettings;

    // Fallback if data is missing: try to find it in the local state
    const data = serviceData || get().services.find(s => s.id === serviceId);

    if (!data) {
      showNotification("Could not identify service to delete.", "error");
      return false;
    }

    try {
      // CHECKPOINT 1: Loyalty
      if (loyaltySettings?.is_enabled && loyaltySettings.free_service_type === data.name) {
        showNotification(`Cannot delete: "${data.name}" is the Loyalty Reward.`, "error");
        return false;
      }

      // CHECKPOINT 2: Active Orders
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("status", "not-in", ["completed", "picked_up"]));
      const snapshot = await getDocs(q);
      
      const inActiveOrder = snapshot.docs.some(docSnap => 
        docSnap.data().services?.some(s => s.id === serviceId)
      );

      if (inActiveOrder) {
        showNotification("Service is in use by active orders.", "error");
        return false;
      }

      // CHECKPOINT 3: Archive & Delete
      await addDoc(collection(db, "deleted_services"), {
        ...data,
        original_id: serviceId,
        archived_at: new Date().toISOString(),
        archive_reason: "Manual Deletion"
      });

      await deleteDoc(doc(db, "services", serviceId));
      showNotification(`${data.name} deleted successfully`, "success");
      return true;

    } catch (err) {
      console.error("Delete failed:", err);
      showNotification("Cloud transfer failed", "error");
      return false;
    }
  }
}));