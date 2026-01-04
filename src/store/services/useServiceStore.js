import { create } from 'zustand';
import { db } from '../../services/firebase'; 
import { 
  collection, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, query, orderBy, where, getDocs
} from 'firebase/firestore';

// Note: We are NOT importing other stores at the top level anymore.

export const useServiceStore = create((set, get) => ({
  services: [],
  isLoading: true,

  subscribeToServices: () => {
    const q = query(collection(db, "services"), orderBy("name", "asc"));
    
    return onSnapshot(q, async (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      set({ services: servicesData, isLoading: false });
    }, async (error) => {
      console.error("Firebase Subscription Error:", error);
      // Lazy load notification for error handling
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
    return true; // Tell the component we succeeded
  } catch (error) {
    showNotification("Failed to add service.", "error");
    return false; // Tell the component we failed
  }
},

 updateService: async (id, updatedData) => {
  const { useNotificationStore } = await import("../ui/useNotificationStore"); 
  const { useLoyaltyStore } = await import("./useLoyaltyStore");

  const { showNotification } = useNotificationStore.getState();
  const loyaltySettings = useLoyaltyStore.getState().loyaltySettings;

  const services = get().services;
  const currentService = services.find(s => s.id === id);

  try {
    // CHECKPOINT: If we are DISABLING the service
    if (currentService.is_active && updatedData.is_active === false) {
      
      // 1. Loyalty Check
      if (loyaltySettings.is_enabled && loyaltySettings.free_service_type === currentService.name) {
        const msg = `Cannot disable: "${currentService.name}" is currently the Loyalty Reward.`;
        showNotification(msg, "error");
        return false; // Stop execution quietly
      }

      // 2. Active Order Check
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("status", "not-in", ["completed", "picked_up"]));
      const snapshot = await getDocs(q);
      const inUse = snapshot.docs.some(d => d.data().services?.some(s => s.id === id));
      
      if (inUse) {
        const msg = "Cannot disable: Service is currently in use by active orders.";
        showNotification(msg, "error");
        return false; // Stop execution quietly
      }
    }

    // CHECKPOINT: If we are CHANGING THE NAME
    if (updatedData.name && updatedData.name !== currentService.name) {
       if (loyaltySettings.is_enabled && loyaltySettings.free_service_type === currentService.name) {
          const msg = "Cannot rename: Update Loyalty Settings reward first.";
          showNotification(msg, "error");
          return false; // Stop execution quietly
       }
    }

    // If all checks pass, proceed to update
    const serviceRef = doc(db, "services", id);
    await updateDoc(serviceRef, updatedData);
    
    try {
    // If checkpoints pass:
    const serviceRef = doc(db, "services", id);
    await updateDoc(serviceRef, updatedData);
    
    // Only show notification for manual saves (not toggles)
    if (Object.keys(updatedData).length > 1) {
      showNotification("Service updated successfully", "success");
    }
    return true; // Success!
  } catch (error) {
    // If it's not a validation error we already handled:
    if (!error.message.startsWith("Cannot")) {
      const { useNotificationStore } = await import("../ui/useNotificationStore");
      useNotificationStore.getState().showNotification("Update failed", "error");
    }
    return false; // Failure!
  }

  } catch (error) {
    console.error("Database Error:", error);
    showNotification("Failed to sync with cloud", "error");
    return false;
  }
},

  deleteServiceSafe: async (serviceId, serviceData) => {
    // Lazy load BOTH stores to break the circular loop
    const { useLoyaltyStore } = await import("./useLoyaltyStore");
    const { useNotificationStore } = await import("../ui/useNotificationStore"); 

    const { showNotification } = useNotificationStore.getState();
    const loyaltySettings = useLoyaltyStore.getState().loyaltySettings;

    if (!serviceData) {
      showNotification("Missing service data.", "error");
      throw new Error("Service data is missing.");
    }

    // CHECKPOINT 1: Loyalty Check
    if (loyaltySettings.is_enabled && loyaltySettings.free_service_type === serviceData.name) {
      const msg = `Cannot delete: "${serviceData.name}" is the Loyalty Reward.`;
      showNotification(msg, "error");
      throw new Error(msg);
    }

    // CHECKPOINT 2: Active Orders Check
    try {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("status", "not-in", ["completed", "picked_up"]));
      const snapshot = await getDocs(q);
      
      const inActiveOrder = snapshot.docs.some(docSnap => {
        const order = docSnap.data();
        return order.services?.some(s => s.id === serviceId);
      });

      if (inActiveOrder) {
        const msg = "Service is in use by active orders.";
        showNotification(msg, "error");
        throw new Error(msg);
      }

      // CHECKPOINT 3: The Archive Move
      await addDoc(collection(db, "deleted_services"), {
        ...serviceData,
        original_id: serviceId,
        archived_at: new Date().toISOString(),
        archive_reason: "Manual Deletion"
      });

      await deleteDoc(doc(db, "services", serviceId));
      showNotification(`${serviceData.name} deleted successfully`, "success");

    } catch (err) {
      if (!err.message.includes("Cannot delete")) {
        showNotification("Cloud transfer failed", "error");
      }
      throw err;
    }
  }
}));