import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconPackage } from "../icons";
import { useServiceStore } from "../../store/services/useServiceStore";

const SPRING_TRANSITION = {
  type: "spring", stiffness: 300, damping: 30, mass: 1, restDelta: 0.01
};

export const ServiceSelector = ({
  selectedServices,
  setSelectedServices,
  Button,
  Badge,
}) => {
  const { services, subscribeToServices, isLoading } = useServiceStore();

  useEffect(() => {
    const unsubscribe = subscribeToServices();
    return () => unsubscribe();
  }, [subscribeToServices]);

  // --- 1. DEFINED ORDER: The object keys determine the rank ---
  const serviceTypeLabels = {
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

  // Helper to find current quantity of a service in the cart
  const getQuantity = (serviceId) => {
    const item = selectedServices.find(s => s.id === serviceId && !s.is_reward);
    return item ? item.quantity : 0;
  };

  const updateQuantity = (service, delta) => {
    const existingIndex = selectedServices.findIndex((s) => s.id === service.id && !s.is_reward);
    
    if (existingIndex !== -1) {
      const updatedServices = [...selectedServices];
      const newQty = updatedServices[existingIndex].quantity + delta;

      if (newQty <= 0) {
        // Remove if quantity hits 0
        setSelectedServices(selectedServices.filter((_, i) => i !== existingIndex));
      } else {
        // Update existing
        updatedServices[existingIndex] = {
          ...updatedServices[existingIndex],
          quantity: newQty,
          subtotal: newQty * service.price_per_kg,
        };
        setSelectedServices(updatedServices);
      }
    } else if (delta > 0) {
      // Add new
      setSelectedServices([...selectedServices, {
        id: service.id,
        service_name: service.name,
        service_type: service.type,
        quantity: 1,
        price_per_kg: service.price_per_kg,
        subtotal: service.price_per_kg,
        is_reward: false
      }]);
    }
  };

  // Group services by their type
  const groupedServices = services
    .filter(s => s.is_active)
    .reduce((acc, service) => {
      const type = service.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(service);
      return acc;
    }, {});

  // --- 2. SORTING LOGIC: Force the groups to follow the label order ---
  // This creates an array of keys (e.g. ['wash_only', 'dry_only'...])
  // sorted by their position in the serviceTypeLabels object.
  const serviceOrder = Object.keys(serviceTypeLabels);
  
  const sortedServiceTypes = Object.keys(groupedServices).sort((a, b) => {
    const indexA = serviceOrder.indexOf(a);
    const indexB = serviceOrder.indexOf(b);
    
    // If a type isn't in our list (e.g. 'other'), push it to the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 shadow-md rounded-xl border border-gray-100 overflow-hidden"
    >
      <div className="p-4 pb-2 border-b border-gray-50 bg-white">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <IconPackage className="w-6 h-6 !text-[#2d79f3] !stroke-[#2d79f3]" />
          Services
        </h3>
      </div>

      <div className="p-4 pt-0 space-y-8">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400 italic">Syncing with cloud...</div>
        ) : (
          // --- 3. RENDER LOOP: Iterate over the SORTED keys ---
          sortedServiceTypes.map((type) => (
            <div key={type} className="space-y-2 !mt-4">
              <h4 className="text-xs uppercase font-bold text-blue-600 ml-1">
                {serviceTypeLabels[type] || type.replace('_', ' ')}
              </h4>
              
              <div className="grid gap-2">
                {groupedServices[type].map((service) => {
                  const qty = getQuantity(service.id);
                  return (
                    <div 
                      key={service.id} 
                      className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                        qty > 0 
                          ? "border-1 border-gray-600 shadow-sm" 
                          : "bg-gray-50/50 border border-gray-100 hover:border-gray-300"
                      }`}
                    >
 
                      <div className="flex-1">
                        <h5 className="font-bold text-gray-900 text-[16px]">{service.name}</h5>
                        <Badge className="text-xs font-bold text-gray-600"> ₱{Number(service.price_per_kg).toFixed(2)}</Badge>
                      </div>

                      {/* QUANTITY CONTROLS */}
                      <div className="flex items-center gap-2 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateQuantity(service, -1)}
                          disabled={qty === 0}
                          className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-all active:scale-90 hover:bg-gray-50 disabled:opacity-20 disabled:border-gray-300 disabled:cursor-not-allowed"
                        >
                          <p className="text-xl font-medium text-gray-800">–</p>
                        </button>
                        
                        <div className="w-8 text-center font-bold text-sm text-gray-800">
                          {qty}
                        </div>

                        <button
                          onClick={() => updateQuantity(service, 1)}
                          aria-label={`Add ${service.name}`}
                          className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-700 transition-colors"
                        >
                          <span className="text-xl font-medium text-white">+</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* SUMMARY OF SELECTED ITEMS */}
        <AnimatePresence>
          {selectedServices.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="!pt-0 border-t border-gray-100"
            >
              <h3 className="text-sm font-bold text-gray-700 mb-3 ml-1">Current Selection</h3>
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
                         <span className="text-[12px] font-medium text-gray-700 leading-none">x</span>
                         <span className="text-sm font-bold text-gray-700 leading-none">{service.quantity}</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[16px] font-bold text-gray-900 leading-tight">
                          {service.service_name}
                        </span>
                        <span className="text-[12px] font-bold text-blue-600 uppercase tracking-tight">
                           ₱{Number(service.price_per_kg).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 ">
                      <span className="text-[17px] font-mono font-medium text-gray-900">
                        ₱{service.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}