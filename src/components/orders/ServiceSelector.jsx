import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useServiceStore } from "../../store/services/useServiceStore";
import { IconPackage } from "../icons";

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
        setSelectedServices(selectedServices.filter((_, i) => i !== existingIndex));
      } else {
        updatedServices[existingIndex] = {
          ...updatedServices[existingIndex],
          quantity: newQty,
          subtotal: newQty * service.price_per_kg,
        };
        setSelectedServices(updatedServices);
      }
    } else if (delta > 0) {
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

  const groupedServices = services
    .filter(s => s.is_active)
    .reduce((acc, service) => {
      const type = service.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(service);
      return acc;
    }, {});

  const serviceOrder = Object.keys(serviceTypeLabels);
  
  const sortedServiceTypes = Object.keys(groupedServices).sort((a, b) => {
    const indexA = serviceOrder.indexOf(a);
    const indexB = serviceOrder.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden"
    >
      <div className="p-4 pb-2 border-b border-gray-50 bg-white">
        {/* HEADER: text-h3 */}
        <h3 className="flex items-center gap-2 text-h3 font-bold text-text-dark">
          <IconPackage className="w-6 h-6 !text-btn-primary !stroke-btn-primary" />
          Services
        </h3>
      </div>

      <div className="p-4 pt-0 space-y-8 bg-white">
        {isLoading ? (
          <div className="py-10 text-center text-sm-text text-gray-400 italic">Syncing with cloud...</div>
        ) : (
          sortedServiceTypes.map((type) => (
            <div key={type} className="space-y-2 !mt-4">
              {/* CATEGORY LABEL: text-nano uppercase */}
              <h4 className="text-sm-text uppercase font-bold text-btn-primary ml-1">
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
                          ? " border border-app-dark shadow-md scale-[1.0]" 
                          : "bg-gray-50/50 border border-gray-100 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex-1">
                        {/* SERVICE NAME: text-base-text */}
                        <h5 className="font-bold text-gray-900 text-base-text">{service.name}</h5>
                        {/* PRICE BADGE: text-micro */}
                        <Badge className="text-micro font-bold text-gray-600"> ₱{Number(service.price_per_kg).toFixed(2)}</Badge>
                      </div>

                      <div className="flex items-center gap-2 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateQuantity(service, -1)}
                          disabled={qty === 0}
                          className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-all active:scale-90 hover:bg-gray-50 disabled:opacity-20 disabled:border-gray-300 disabled:cursor-not-allowed"
                        >
                          <p className="text-h3 font-medium text-gray-800 leading-none">–</p>
                        </button>
                        
                        {/* QTY DISPLAY: text-sm-text */}
                        <div className="w-8 text-center font-bold text-sm-text text-gray-800">
                          {qty}
                        </div>

                        <button
                          onClick={() => updateQuantity(service, 1)}
                          aria-label={`Add ${service.name}`}
                          className="w-10 h-8 flex items-center justify-center rounded-md bg-btn-primary text-white hover:bg-btn-primary/80 transition-colors"
                        >
                          <span className="text-h3 font-medium text-white leading-none">+</span>
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
              {/* SELECTION HEADER: text-micro uppercase */}
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
                        {/* ITEM NAME: text-base-text */}
                        <span className="text-base-text font-bold text-gray-900 leading-tight">
                          {service.service_name}
                        </span>
                        {/* ITEM PRICE: text-nano */}
                        <span className="text-micro font-bold text-text-dark/90 uppercase tracking-tight">
                            ₱{Number(service.price_per_kg).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className=" py-1.5 ">
                      {/* ITEM TOTAL: text-base-text */}
                      <span className="font-bold text-text-dark text-base-text">
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
};