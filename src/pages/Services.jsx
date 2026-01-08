import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { LoginPopup } from "../modal/LoginPopup"; 
import LoyaltySettings from "../components/services/LoyaltySettings";
import ServiceCard from "../components/services/ServiceCard";
import { IconPlus } from "../components/icons";
import { useServiceStore } from "../store/services/useServiceStore";

// 1. IMPORT THE ACTIVITY STORE
import { useActivityStore } from "../store/activities/useActivityStore";

const SMOOTH_TRANSITION = { type: "spring", stiffness: 300, damping: 30, mass: 1 };

// ... (Button, Input, Badge components remain the same)
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

    className={`flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${className}`}

    {...props}

  />

);



export const Badge = ({ children, className }) => (

  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${className}`}>

    {children}

  </span>

);

export default function Services() {
  const { services, isLoading, addService, updateService, subscribeToServices, deleteServiceSafe } = useServiceStore();
  
  // 2. INITIALIZE THE LOGGER
  const logActivity = useActivityStore((state) => state.logActivity);

  const [editingId, setEditingId] = useState(null);
  const [tempData, setTempData] = useState(null);
  const [popup, setPopup] = useState({ message: "", type: "info" });
  const [allowOverflow, setAllowOverflow] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToServices();
    return () => unsubscribe();
  }, [subscribeToServices]);

  const triggerPopup = (message, type = "error") => setPopup({ message, type });

  // 3. UPDATED SAVE HANDLER
  const handleSave = async (id) => {
    if (!tempData.name.trim()) return triggerPopup("Name is required");
    const price = parseFloat(tempData.price_per_kg);
    if (isNaN(price) || price <= 0) return triggerPopup("Invalid price");

    try {
      let result = false;
      if (id === "new_draft") {
        const { id: _, ...cleanData } = tempData; 
        result = await addService({ ...cleanData, price_per_kg: price }); 
        
        // LOG ACTIVITY: New Service Created
        if (result) {
          logActivity({
            customer_name: tempData.name, // Display service name as main text
            order_number: "NEW SERVICE",
            total_amount: price
          }, 'pending', 'created');
        }
      } else {
        result = await updateService(id, { ...tempData, price_per_kg: price });
        
        // LOG ACTIVITY: Service Updated
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
    }
  };

  // 4. UPDATED TOGGLE HANDLER
  const toggleStatus = async (id, currentStatus) => {
    const service = services.find(s => s.id === id);
    const newStatus = !currentStatus;
    
    await updateService(id, { is_active: newStatus });

    // LOG ACTIVITY: Service Toggled (Active/Inactive)
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

  if (isLoading) return <div className="p-10 text-center">Loading Cloud Services...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 md:p-6">
      <LoginPopup message={popup.message} type={popup.type} onClose={() => setPopup({ ...popup, message: "" })} />

      <motion.div layoutRoot className="max-w-5xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div> 
            <h1 className="text-2xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-600 mt-1 text-[14px]">Manage your shop's offering</p>
          </div>
          <Button onClick={addNewService} className="bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md h-9">
            <IconPlus className="w-4 h-4 mr-2 !text-white !stroke-white" /> 
            <span className="text-sm font-medium text-white">Add Service</span>
          </Button>
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
                className="mb-4 relative z-50" 
              >
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

          <div className="relative z-0">
             <LoyaltySettings />
          </div>

          <div className="grid gap-3 relative z-0">
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
                        // LOG ACTIVITY: Service Deleted
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