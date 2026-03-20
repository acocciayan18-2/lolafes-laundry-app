import React, { useEffect, useMemo, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useServiceStore } from "../../store/services/useServiceStore";
import { IconPackage } from "../icons";

// ==========================================
// ⚙️ CONFIGURATION & CONSTANTS
// ==========================================
const SPRING_TRANSITION = Object.freeze({
  type: "spring", stiffness: 300, damping: 30, mass: 1, restDelta: 0.01
});

const SERVICE_TYPE_LABELS = Object.freeze({
  wash_only: "Wash Only",
  dry_only: "Dry Only",
  wash_dry: "Wash & Dry",
  fold_only: "Fold Only",
  press_only: "Press Only",
  wash_fold: "Wash & Fold",
  dry_fold: "Dry & Fold",
  dry_press: "Dry & Press",
  wash_dry_fold: "Wash, Dry & Fold",
  wash_dry_press: "Wash, Dry & Press",
  wash_fold_press: "Wash, Fold & Press",
  full_service: "Full Service (W/D/F/P)",
  special_care: "Delicates / Handwash",
  bulk_items: "Bulk (Comforters/Rug)",
  add_on: "Add-ons & Supplies"
});

// ==========================================
// 🛡️ UTILITY HELPERS
// ==========================================
/**
 * @description Safely parses numbers to avoid floating point math errors and NaN propagation.
 */
const safeMoney = (val) => {
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
};

// ==========================================
// 🧩 MAIN COMPONENT
// ==========================================
export const ServiceSelector = ({
  selectedServices = [],
  setSelectedServices,
  Badge,
  isCustomerIncomplete = true // Required for both regular and walk-in guests
}) => {
  const { services, subscribeToServices, isLoading } = useServiceStore();
  const isMounted = useRef(false);

  // --- LIFECYCLE ---
  useEffect(() => {
    isMounted.current = true;
    let unsubscribe = () => {};

    try {
      if (typeof subscribeToServices === 'function') {
        unsubscribe = subscribeToServices();
      }
    } catch (err) {
      console.error("[ServiceSelector] Subscription Failed:", err);
    }

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [subscribeToServices]);

  // --- DERIVED STATE (MEMOIZED) ---

  // O(1) Lookup dictionary for selected quantities
  const quantityMap = useMemo(() => {
    if (!Array.isArray(selectedServices)) return {};
    const map = {};
    selectedServices.forEach(s => {
      if (s && !s.is_reward) map[s.id] = s.quantity || 0;
    });
    return map;
  }, [selectedServices]);

  const getQuantity = useCallback((serviceId) => {
    return quantityMap[serviceId] || 0;
  }, [quantityMap]);

  // Categorize and sort services strictly once per service payload change
  const { groupedServices, sortedServiceTypes } = useMemo(() => {
    if (!Array.isArray(services) || services.length === 0) {
      return { groupedServices: {}, sortedServiceTypes: [] };
    }

    const grouped = services
      .filter(s => s && s.is_active)
      .reduce((acc, service) => {
        const type = service.type || 'other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(service);
        return acc;
      }, {});

    const serviceOrder = Object.keys(SERVICE_TYPE_LABELS);
    const sortedTypes = Object.keys(grouped).sort((a, b) => {
      const indexA = serviceOrder.indexOf(a);
      const indexB = serviceOrder.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return { groupedServices: grouped, sortedServiceTypes: sortedTypes };
  }, [services]);

  // --- HANDLERS ---

  /**
   * @description Safely increments/decrements service quantities and calculates exact subtotals.
   * @security Implements a strict gate against `isCustomerIncomplete`.
   */
  const updateQuantity = useCallback((service, delta) => {
    // ✨ SECURITY FIX: Hard gate. Prevent JS/Console bypassing of the UI disabled state.
    if (isCustomerIncomplete) {
      console.warn("Action Denied: Customer name is required before selecting services.");
      return;
    }
    
    if (!service || !service.id || typeof setSelectedServices !== 'function') return;

    const safeDelta = Number(delta);
    if (isNaN(safeDelta)) return;

    const price = safeMoney(service.price_per_kg); 
    const currentServices = Array.isArray(selectedServices) ? selectedServices : [];
    const existingIndex = currentServices.findIndex((s) => s.id === service.id && !s.is_reward);
    
    if (existingIndex !== -1) {
      const updatedServices = [...currentServices];
      const newQty = Math.max(0, Number(updatedServices[existingIndex].quantity) + safeDelta);

      if (newQty <= 0) {
        setSelectedServices(currentServices.filter((_, i) => i !== existingIndex));
      } else {
        updatedServices[existingIndex] = {
          ...updatedServices[existingIndex],
          quantity: newQty,
          subtotal: safeMoney(newQty * price),
        };
        setSelectedServices(updatedServices);
      }
    } else if (safeDelta > 0) {
      setSelectedServices([...currentServices, {
        id: String(service.id),
        service_name: String(service.name).substring(0, 100), // Prevent payload injection
        service_type: String(service.type),
        quantity: 1,
        price_per_kg: price,
        subtotal: price,
        is_reward: false
      }]);
    }
  }, [isCustomerIncomplete, selectedServices, setSelectedServices]);

  // --- RENDER ---
  return (
    <section 
      aria-labelledby="service-selector-title"
      className={`bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden transition-opacity duration-300 ${isCustomerIncomplete ? 'opacity-60' : 'opacity-100'}`}
    >
      <header className="p-4 pb-2 border-b border-gray-50 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 id="service-selector-title" className="flex items-center gap-2 text-h3 font-bold text-text-dark">
            <IconPackage aria-hidden="true" className="w-6 h-6 !text-btn-primary !stroke-btn-primary" />
            Services
          </h3>
          {isCustomerIncomplete && (
            <span role="alert" className="text-micro text-amber-600 px-2 py-1 w-fit ">
             Provide customer info first
            </span>
          )}
        </div>
      </header>

      <div className="p-4 pt-0 space-y-8 bg-white">
        {isLoading ? (
          <div aria-live="polite" className="py-10 text-center text-sm-text text-gray-400 italic">
            Loading catalog...
          </div>
        ) : (
          sortedServiceTypes.map((type) => (
            <div key={type} className="space-y-2 !mt-4" role="group" aria-labelledby={`group-${type}`}>
              <h4 id={`group-${type}`} className="text-sm-text uppercase font-bold text-btn-primary ml-1">
                {SERVICE_TYPE_LABELS[type] || type.replace('_', ' ')}
              </h4>
              
              <div className="grid gap-2">
                {groupedServices[type].map((service) => {
                  const qty = getQuantity(service.id);
                  return (
                    <article 
                      key={service.id} 
                      className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                        qty > 0 
                          ? "border border-app-dark/70 shadow-md" 
                          : "bg-gray-50 border border-gray-100"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <h5 className="font-bold text-gray-900 text-sm-text truncate" title={service.name}>{service.name}</h5>
                        {Badge && (
                          <Badge className="font-bold text-gray-600"> 
                            ₱{safeMoney(service.price_per_kg).toFixed(2)}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 p-1 rounded-lg shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(service, -1)}
                          disabled={qty === 0 || isCustomerIncomplete}
                          aria-label={`Decrease quantity of ${service.name}`}
                          className="w-8 h-8 flex items-center justify-center rounded-md transition-all active:scale-90 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark"
                        >
                          <span className="text-h3  text-gray-800 leading-none" aria-hidden="true">–</span>
                        </button>
                        
                        <div 
                          className="w-8 text-center font-bold text-sm-text text-gray-800" 
                          aria-live="polite"
                          aria-atomic="true"
                          aria-label={`Current quantity: ${qty}`}
                        >
                          {qty}
                        </div>

                        <button
                          type="button"
                          onClick={() => updateQuantity(service, 1)}
                          disabled={isCustomerIncomplete}
                          aria-label={`Increase quantity of ${service.name}`}
                          className={`w-10 h-8 flex items-center justify-center rounded-md transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-btn-primary ${
                            isCustomerIncomplete 
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                              : "bg-btn-primary text-white hover:bg-btn-primary/80 shadow-sm"
                          }`}
                        >
                          <span className="text-h3  leading-none" aria-hidden="true">+</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}
        
        {/* Selected Services Summary Panel */}
        <AnimatePresence>
          {Array.isArray(selectedServices) && selectedServices.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="text-sm-text font-bold text-text-dark/70 mb-3 ml-1 tracking-wider">Current Selection</h3>
              <div className="space-y-3" role="list" aria-label="Selected Services">
                {selectedServices.map((service, index) => (
                  <motion.div 
                    key={service.id || index} 
                    layout
                    transition={SPRING_TRANSITION}
                    role="listitem"
                    className="flex justify-between items-center bg-gray-50/30 p-3 rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex flex-row items-center justify-center shrink-0" aria-label={`Quantity: ${service.quantity}`}>
                         <span className="text-micro  text-text-dark/70 leading-none" aria-hidden="true">x</span>
                         <span className="text-sm-text font-bold text-text-dark/70 leading-none">{service.quantity}</span>
                      </div>

                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-sm-text font-bold text-gray-900 leading-tight truncate" title={service.service_name}>
                          {service.service_name}
                        </span>
                        <span className="text-sm-text font-bold text-text-dark/90 uppercase mt-0.5">
                            ₱{safeMoney(service.price_per_kg).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="py-1.5 shrink-0 text-right">
                      <span className="font-bold text-text-dark text-sm-text" aria-label={`Subtotal: ₱${safeMoney(service.subtotal).toFixed(2)}`}>
                        ₱{safeMoney(service.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};