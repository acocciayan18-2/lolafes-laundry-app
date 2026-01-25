import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { IconGridPlus } from "../components/icons";
import LoyaltySettings from "../components/services/LoyaltySettings";
import ServiceCard from "../components/services/ServiceCard";
import { ServicesSkeleton } from "../components/skeleton-loader";
import { useActivityStore } from "../store/activities/useActivityStore";
import { useServiceStore } from "../store/services/useServiceStore";

// 1. IMPORT THE POPUP COMPONENT
import { LoginPopup } from "../modal/LoginPopup"; 

const SMOOTH_TRANSITION = { type: "spring", stiffness: 300, damping: 30, mass: 1 };

export const Button = ({ children, onClick, className = "", variant = "primary", ...props }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    outline: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-sm"
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg font-bold transition-all px-4 py-2 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ className = "", ...props }) => (
  <input
    className={`flex h-10 w-full rounded-lg border font-medium border-slate-200 bg-white px-3 py-2 text-base-text placeholder:text-slate-400 focus:outline-none !focus:ring-1 focus:ring-app-dark/70  ${className}`}
    {...props}
  />
);

export const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-micro font-bold border uppercase ${className}`}>
    {children}
  </span>
);

export default function Services() {
  const { services, isLoading, addService, updateService, subscribeToServices, deleteServiceSafe } = useServiceStore();
  const logActivity = useActivityStore((state) => state.logActivity);

  const [editingId, setEditingId] = useState(null);
  const [tempData, setTempData] = useState(null);
  const [popup, setPopup] = useState({ message: "", type: "info" });
  const [allowOverflow, setAllowOverflow] = useState(false);
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToServices();
    return () => unsubscribe();
  }, [subscribeToServices]);

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        setShouldShowSkeleton(true);
      }, 400);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  const triggerPopup = (message, type = "error") => setPopup({ message, type });

  const handleSave = async (id) => {
    if (!tempData.name.trim()) return triggerPopup("Name is required");
    const price = parseFloat(tempData.price_per_kg);
    if (isNaN(price) || price <= 0) return triggerPopup("Invalid price");

    try {
      let result = false;
      if (id === "new_draft") {
        const { id: _, ...cleanData } = tempData; 
        result = await addService({ ...cleanData, price_per_kg: price }); 
        
        if (result) {
          logActivity({
            customer_name: tempData.name,
            order_number: "NEW SERVICE",
            total_amount: price
          }, 'pending', 'created');
        }
      } else {
        result = await updateService(id, { ...tempData, price_per_kg: price });
        
        if (result) {
          logActivity({
            customer_name: tempData.name,
            order_number: "UPDATED",
            total_amount: price
          }, 'in_progress', 'status_update');
        }
      }

      if (result === false) return;
      setEditingId(null);
      setTempData(null);
    } catch (err) {
      console.error("Firebase Save Error:", err); 
      triggerPopup("Failed to save service. Please check your connection.");
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const service = services.find(s => s.id === id);
    const newStatus = !currentStatus;
    await updateService(id, { is_active: newStatus });

    logActivity({
      customer_name: service?.name || "Service",
      order_number: newStatus ? "ACTIVATED" : "DEACTIVATED",
      total_amount: service?.price_per_kg || 0
    }, newStatus ? 'ready' : 'picked_up', 'status_update');
  };

  const addNewService = () => {
    if (editingId) return;
    setAllowOverflow(false);
    setEditingId("new_draft");
    setTempData({ name: "", type: "wash_only", price_per_kg: 0, duration_hours: 24, is_active: true });
  };

  if (isLoading && shouldShowSkeleton) {
    return <ServicesSkeleton />;
  }

  if (isLoading && !shouldShowSkeleton) {
    return null;
  }

  return (
    <div className="min-h-screen bg-app-light p-2">
      {/* 2. RENDER THE POPUP HERE */}
      <LoginPopup 
        message={popup.message} 
        type={popup.type} 
        onClose={() => setPopup({ ...popup, message: "" })} 
      />

      <motion.div layoutRoot className="max-w-6xl mx-auto px-1 md:px-2">
        <div className="flex justify-between items-center mb-3">
          <div> 
            <h1 className="text-h2 font-bold text-text-dark">Services</h1>
            <p className="text-sm-text text-gray-600 mt-0.5">Manage your shop's offering</p>
          </div>
          <button 
            onClick={addNewService} 
            className="group flex items-center justify-center w-9 shadow-md h-9 hover:bg-app-dark/5 bg-white rounded-xl border border-1 border-text-dark/20 active:scale-95 transition-all duration-200"
            title="Add Service"
          >
            <IconGridPlus className="w-4 h-4 text-black stroke-black" strokeWidth={2.2} />
          </button>
        </div>

        <LayoutGroup>
          <AnimatePresence mode="wait" onExitComplete={() => setAllowOverflow(false)}>
            {editingId === "new_draft" && (
              <motion.div 
                key="new-service-form"
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                exit={{ opacity: 0, height: 0 }} 
                onAnimationComplete={() => setAllowOverflow(true)}
                onExitStart={() => setAllowOverflow(false)}
                transition={SMOOTH_TRANSITION}
                style={{ overflow: allowOverflow ? "visible" : "hidden" }}
                className="mb-4 relative z-[50]" 
              >
                <div className="flex items-center gap-2 mb-2 ml-1">
                  <div className="w-0.5 h-3 bg-app-dark/80 rounded-full" />
                  <span className="text-sm-text font-medium text-text-dark/80">
                    Add New Service
                  </span>
                </div>

                <ServiceCard 
                  service={tempData} 
                  isEditing={true}
                  tempData={tempData} 
                  setTempData={setTempData}
                  onSave={() => handleSave("new_draft")}
                  onCancel={() => setEditingId(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-[40] mb-3">
            <LoyaltySettings />
          </div>

          <div className="grid gap-3 relative z-[10]">
            <AnimatePresence mode="popLayout">
              {services.map((service) => (
                <motion.div key={service.id} layout transition={SMOOTH_TRANSITION}>
                  <ServiceCard 
                    service={service} 
                    isEditing={editingId === service.id}
                    tempData={tempData}
                    setTempData={setTempData}
                    onEdit={(s) => { setEditingId(s.id); setTempData({...s}); }} 
                    onSave={() => handleSave(service.id)}
                    onCancel={() => setEditingId(null)}
                    onToggle={() => toggleStatus(service.id, service.is_active)} 
                    onDelete={(id) => {
                      const s = services.find(item => item.id === id);
                      logActivity({
                          customer_name: s?.name || "Service",
                          order_number: "DELETED",
                          total_amount: s?.price_per_kg || 0
                      }, 'picked_up', 'status_update');
                      deleteServiceSafe(id);
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}