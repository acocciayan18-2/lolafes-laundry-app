/**
 * @file useServiceStore.js
 * @version 3.0.0 - Enterprise Edition
 * @description Production-grade Service Management. Implements ACID transactions,
 * O(1) lookups, strict sanitization, and optimized network batching.
 */

import { create } from 'zustand';
import { db } from '../../services/firebase';
import { 
  collection, onSnapshot, addDoc, doc, query, orderBy, where, getDocs, limit, Timestamp, runTransaction 
} from 'firebase/firestore';

// ==========================================
// 🛡️ SECURITY & UTILITIES (Pure Functions)
// ==========================================

/** 
 * @description Prevents Stored XSS by stripping markup tags.
 */
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, "").trim();
};

/** 
 * @description Robust currency parser. Strips symbols/letters, prevents NaN, and enforces safe rounding.
 */
const safeMoney = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Math.round(val * 100) / 100;
  
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = Number(cleaned);
  return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
};

/**
 * @description Strict schema validation gate. Rejects malformed payloads before they reach the DB.
 */
const validateServiceSchema = (data) => {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    throw new Error("Validation Failed: Service name must be at least 2 characters.");
  }
  if (typeof data.price_per_kg !== 'number' || isNaN(data.price_per_kg) || data.price_per_kg < 0) {
    throw new Error("Validation Failed: Service price must be a valid positive number.");
  }
  if (!data.type || typeof data.type !== 'string' || data.type.trim() === '') {
    throw new Error("Validation Failed: Invalid service type selection.");
  }
};

// ==========================================
// ⚛️ DATA ORCHESTRATOR (ZUSTAND)
// ==========================================

export const useServiceStore = create((set, get) => ({
  services: [],
  serviceMap: new Map(), // O(1) Lookup cache
  isLoading: true,
  isSyncing: false, 

  // 📡 1. SUBSCRIPTION ENGINE (Resilient & Schema-Aware)
  subscribeToServices: () => {
    const q = query(
      collection(db, "services"), 
      orderBy("name", "asc")
    );
    
    return onSnapshot(q, { includeMetadataChanges: true }, 
      (snapshot) => {
        const servicesList = [];
        const map = new Map();

        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          
          // Schema Migration Fallbacks (Zero-downtime transition)
          const rawPrice = data.price_per_kg !== undefined ? data.price_per_kg : data.price;
          const rawType = data.type || data.category || 'wash_dry';

          const normalizedRecord = { 
            id: docSnap.id, 
            ...data,
            price_per_kg: safeMoney(rawPrice), 
            type: rawType,
            is_active: data.is_active ?? true 
          };

          servicesList.push(normalizedRecord);
          map.set(normalizedRecord.id, normalizedRecord);
        });

        set({ 
          services: servicesList, 
          serviceMap: map,
          isLoading: false,
          isFromCache: snapshot.metadata.fromCache 
        });
      }, 
      (error) => {
        console.error("[🔴 POS CRITICAL] Service Subscription Failure:", error);
        set({ isLoading: false });
      }
    );
  },

  // 🔍 2. INTEGRITY CHECK (Optimized Batching)
  checkServiceInUse: async (serviceId) => {
    try {
      const ordersRef = collection(db, "orders");
      const activeStatuses = ["pending", "in_progress", "ready"];
      
      // ✨ PERFORMANCE FIX: Batch the query using the "in" operator instead of looping multiple queries
      const q = query(
        ordersRef, 
        where("status", "in", activeStatuses),
        limit(100) 
      );
      
      const snapshot = await getDocs(q);
      
      // Scan memory for the service usage
      const isInUse = snapshot.docs.some(doc => {
         const orderData = doc.data();
         if (!Array.isArray(orderData.services)) return false;
         return orderData.services.some(s => s.service_id === serviceId || s.id === serviceId);
      });

      return isInUse;
    } catch (err) {
      console.error("[ServiceStore] Dependency check failed:", err);
      return true; // Fail-secure: Block deletion if we cannot confirm safety
    }
  },

  // ✍️ 3. CORE ACTIONS (Atomic & Transactional)
  addService: async (rawServiceData) => {
    const { showNotification } = (await import("../ui/useNotificationStore")).useNotificationStore.getState();
    
    try {
      const sanitizedName = sanitizeInput(rawServiceData.name);
      
      // ✨ SECURITY FIX: Duplicate Name Collision Detection
      const isDuplicate = get().services.some(
        (s) => s.name.toLowerCase() === sanitizedName.toLowerCase()
      );

      if (isDuplicate) {
        throw new Error(`A service named "${sanitizedName}" already exists.`);
      }

      const sanitizedData = {
        name: sanitizedName,
        price_per_kg: safeMoney(rawServiceData.price_per_kg),
        type: sanitizeInput(rawServiceData.type),
        is_active: true,
        created_at: Timestamp.now()
      };

      validateServiceSchema(sanitizedData);
      
      set({ isSyncing: true });
      await addDoc(collection(db, "services"), sanitizedData);
      
      showNotification(`${sanitizedData.name} created.`, "success");
      return true;
    } catch (error) {
      showNotification(error.message || "Failed to add service.", "error");
      return false;
    } finally {
      set({ isSyncing: false });
    }
  },

  updateService: async (id, updatedData) => {
    const { useNotificationStore } = await import("../ui/useNotificationStore"); 
    const { useLoyaltyStore } = await import("./useLoyaltyStore");

    const notify = useNotificationStore.getState().showNotification;
    const loyalty = useLoyaltyStore.getState().loyaltySettings;
    
    const current = get().serviceMap.get(id);

    if (!current) {
      notify("Service not found in memory.", "error");
      return false;
    }

    try {
      set({ isSyncing: true });

      const safeUpdate = { ...updatedData };
      
      if (safeUpdate.name) {
        safeUpdate.name = sanitizeInput(safeUpdate.name);
        
        // ✨ SECURITY FIX: Duplicate Name Check (Excluding Itself)
        const isDuplicate = get().services.some(
          (s) => s.id !== id && s.name.toLowerCase() === safeUpdate.name.toLowerCase()
        );

        if (isDuplicate) {
          throw new Error(`Another service is already named "${safeUpdate.name}".`);
        }
      }
      
      if (safeUpdate.type) safeUpdate.type = sanitizeInput(safeUpdate.type);
      else if (safeUpdate.category) {
        safeUpdate.type = sanitizeInput(safeUpdate.category);
        delete safeUpdate.category;
      }
      
      if (safeUpdate.price_per_kg !== undefined) {
        safeUpdate.price_per_kg = safeMoney(safeUpdate.price_per_kg);
      } else if (safeUpdate.price !== undefined) {
        safeUpdate.price_per_kg = safeMoney(safeUpdate.price);
        delete safeUpdate.price;
      }

      // Security Gate: Loyalty Protection
      const isLoyaltyReward = loyalty?.is_enabled && loyalty.free_service_type === current.name;

      if (safeUpdate.is_active === false || (safeUpdate.name && safeUpdate.name !== current.name)) {
        if (isLoyaltyReward) {
          throw new Error(`Security Lock: "${current.name}" is a protected Loyalty Reward.`);
        }

        const inUse = await get().checkServiceInUse(id);
        if (inUse) {
          throw new Error("Action Blocked: Service is currently in an active order.");
        }
      }

      const serviceRef = doc(db, "services", id);
      
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(serviceRef);
        if (!sfDoc.exists()) throw new Error("Service no longer exists on the server.");

        transaction.update(serviceRef, {
          ...safeUpdate,
          updated_at: Timestamp.now()
        });
      });
      
      return true;
    } catch (error) {
      console.error("[ServiceStore] Update Error:", error);
      notify(error.message || "Concurrent modification or network error.", "error");
      return false;
    } finally {
      set({ isSyncing: false });
    }
  },

  deleteServiceSafe: async (serviceId) => {
    const { useLoyaltyStore } = await import("./useLoyaltyStore");
    const { useNotificationStore } = await import("../ui/useNotificationStore"); 

    const notify = useNotificationStore.getState().showNotification;
    const loyalty = useLoyaltyStore.getState().loyaltySettings;
    const data = get().serviceMap.get(serviceId);

    if (!data) return false;

    try {
      set({ isSyncing: true });

      if (loyalty?.is_enabled && loyalty.free_service_type === data.name) {
        notify("Active reward items cannot be deleted.", "error");
        return false;
      }

      const inUse = await get().checkServiceInUse(serviceId);
      if (inUse) {
        notify("Service is active in pending laundry orders.", "error");
        return false;
      }

      // ✨ SECURITY FIX: Atomic Transaction for Archiving
      // Ensures the item is never deleted without successfully archiving it first
      await runTransaction(db, async (transaction) => {
        const sourceRef = doc(db, "services", serviceId);
        const archiveRef = doc(collection(db, "deleted_services"));
        
        transaction.set(archiveRef, {
          ...data,
          original_id: serviceId,
          archived_at: Timestamp.now(),
          archive_reason: "Manual Clean-up"
        });

        transaction.delete(sourceRef);
      });

      notify(`${data.name} archived.`, "success");
      return true;

    } catch (err) {
      console.error("[ServiceStore] Deletion Error:", err);
      notify("Could not reach the cloud for deletion.", "error");
      return false;
    } finally {
      set({ isSyncing: false });
    }
  }
}));