import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useCallback } from "react";
import { useServiceStore } from "../../store/services/useServiceStore";
import { IconPackage } from "../icons";

// 1. PERFORMANCE: Move statics outside the component to prevent memory reallocation
const SPRING_TRANSITION = {
  type: "spring", stiffness: 300, damping: 30, mass: 1, restDelta: 0.01
};

const SERVICE_TYPE_LABELS = {
  wash_only: "Wash Only",
  dry_only: "Dry Only",
  fold_only: "Fold Only",
  press_only: "Press Only",
  wash_dry: "Wash & Dry",
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
};

export const ServiceSelector = ({
  selectedServices,
  setSelectedServices,
  Badge,
  isCustomerIncomplete = true 
}) => {
  const { services, subscribeToServices, isLoading } = useServiceStore();

  useEffect(() => {
    const unsubscribe = subscribeToServices();
    return () => unsubscribe();
  }, [subscribeToServices]);

  // ==========================================
  // 2. PERFORMANCE: O(1) Quantity Lookup Map
  // Instead of using .find() inside a map loop, we create a dictionary once.
  // ==========================================
  const quantityMap = useMemo(() => {
    const map = {};
    selectedServices.forEach(s => {
      if (!s.is_reward) map[s.id] = s.quantity;
    });
    return map;
  }, [selectedServices]);

  const getQuantity = useCallback((serviceId) => {
    return quantityMap[serviceId] || 0;
  }, [quantityMap]);

  // ==========================================
  // 3. PERFORMANCE: Memoized Grouping & Sorting
  // Stops the component from re-categorizing 50+ services on every click
  // ==========================================
  const { groupedServices, sortedServiceTypes } = useMemo(() => {
    if (!services || services.length === 0) return { groupedServices: {}, sortedServiceTypes: [] };

    const grouped = services
      .filter(s => s.is_active)
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

  // ==========================================
  // 4. SECURITY & DATA SANITIZATION: Safe Updates
  // ==========================================
  const updateQuantity = useCallback((service, delta) => {
    if (isCustomerIncomplete) return;

    // Sanitize price to ensure math doesn't result in NaN
    const price = Number(service.price_per_kg) || 0; 
    const existingIndex = selectedServices.findIndex((s) => s.id === service.id && !s.is_reward);
    
    if (existingIndex !== -1) {
      const updatedServices = [...selectedServices];
      const newQty = updatedServices[existingIndex].quantity + delta;

      if (newQty <= 0) {
        setSelectedServices(selectedServices.filter((_, i) => i !== existingIndex));
      } else {
        updatedServices[existingIndex] = {
          ...updatedServices[existingIndex],
          quantity: newQty,
          subtotal: newQty * price,
        };
        setSelectedServices(updatedServices);
      }
    } else if (delta > 0) {
      setSelectedServices([...selectedServices, {
        id: service.id,
        service_name: service.name,
        service_type: service.type,
        quantity: 1,
        price_per_kg: price,
        subtotal: price,
        is_reward: false
      }]);
    }
  }, [isCustomerIncomplete, selectedServices, setSelectedServices]);

  return (
    <div className={`bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden transition-opacity duration-300 ${isCustomerIncomplete ? 'opacity-60' : 'opacity-100'}`}>
      <div className="p-4 pb-2 border-b border-gray-50 bg-white">
        <h3 className="flex items-center justify-between text-h3 font-bold text-text-dark">
          <div className="flex items-center gap-2">
            <IconPackage className="w-6 h-6 !text-btn-primary !stroke-btn-primary" />
            Services
          </div>
          {isCustomerIncomplete && (
            <span className="text-micro bg-amber-50 text-amber-600 px-2 py-1 rounded-md border border-amber-100 animate-pulse">
              Complete Customer Info First
            </span>
          )}
        </h3>
      </div>

      <div className="p-4 pt-0 space-y-8 bg-white">
        {isLoading ? (
          <div className="py-10 text-center text-sm-text text-gray-400 italic">Syncing with cloud...</div>
        ) : (
          sortedServiceTypes.map((type) => (
            <div key={type} className="space-y-2 !mt-4">
              <h4 className="text-sm-text uppercase font-bold text-btn-primary ml-1">
                {SERVICE_TYPE_LABELS[type] || type.replace('_', ' ')}
              </h4>
              
              <div className="grid gap-2">
                {groupedServices[type].map((service) => {
                  const qty = getQuantity(service.id);
                  return (
                    <div 
                      key={service.id} 
                      className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                        qty > 0 
                          ? " border border-app-dark/70 shadow-md scale-[1.0]" 
                          : "bg-gray-60/100 border border-gray-100"
                      }`}
                    >
                      <div className="flex-1">
                        <h5 className="font-bold text-gray-900 text-base-text">{service.name}</h5>
                        <Badge className=" font-bold text-gray-600"> ₱{Number(service.price_per_kg).toFixed(2)}</Badge>
                      </div>

                      <div className="flex items-center gap-2 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateQuantity(service, -1)}
                          disabled={qty === 0 || isCustomerIncomplete}
                          aria-label={`Decrease quantity of ${service.name}`}
                          className="w-8 h-8 flex items-center justify-center rounded-md transition-all active:scale-90 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <p className="text-h3 font-medium text-gray-800 leading-none">–</p>
                        </button>
                        
                        <div className="w-8 text-center font-bold text-sm-text text-gray-800" aria-live="polite">
                          {qty}
                        </div>

                        <button
                          type="button"
                          onClick={() => updateQuantity(service, 1)}
                          disabled={isCustomerIncomplete}
                          aria-label={`Increase quantity of ${service.name}`}
                          className={`w-10 h-8 flex items-center justify-center rounded-md transition-all active:scale-95 ${
                            isCustomerIncomplete 
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                              : "bg-btn-primary text-white hover:bg-btn-primary/80"
                          }`}
                        >
                          <span className="text-h3 font-medium leading-none">+</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        
         <AnimatePresence>
          {selectedServices.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="text-micro font-bold text-gray-700 mb-3 ml-1 uppercase tracking-wider">Current Selection</h3>
              <div className="space-y-3">
                {selectedServices.map((service, index) => (
                  <motion.div 
                    key={service.id || index} 
                    layout
                    transition={SPRING_TRANSITION}
                    className="flex justify-between items-center bg-gray-50/30 p-3 rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-row gap-1 items-center justify-center">
                         <span className="text-nano font-medium text-gray-700 leading-none">x</span>
                         <span className="text-sm-text font-bold text-gray-700 leading-none">{service.quantity}</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-base-text font-bold text-gray-900 leading-tight">
                          {service.service_name}
                        </span>
                        <span className="text-micro font-bold text-text-dark/90 uppercase tracking-tight">
                            ₱{Number(service.price_per_kg).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className=" py-1.5 ">
                      <span className="font-bold text-text-dark text-base-text">
                        ₱{Number(service.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};