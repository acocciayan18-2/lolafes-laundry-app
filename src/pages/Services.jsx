import { LayoutGroup } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { IconGridPlus } from "../components/icons";
import LoyaltySettings from "../components/services/LoyaltySettings";
import ServiceCard from "../components/services/ServiceCard";
import { ServicesSkeleton } from "../components/skeleton-loader";
import { useServiceStore } from "../store/services/useServiceStore";
import { LoginPopup } from "../modal/LoginPopup"; 
import StoreGuard from '../components/settings/StoreGuard';

// --- Constants & Helper Components ---
export const Button = ({ children, onClick, className = "", variant = "primary", ...props }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    outline: "bg-white text-text-dark border border-slate-200 hover:bg-slate-50",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg font-bold transition-all px-4 py-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 outline-none ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ className = "", ...props }) => (
  <input
    className={`flex h-10 w-full rounded-lg border  border-slate-200 bg-white px-3 py-2 text-sm-text placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-app-dark/70 transition-shadow ${className}`}
    {...props}
  />
);

export const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-micro font-bold border uppercase ${className}`}>
    {children}
  </span>
);

// --- Main Page Component ---
export default function Services() {
  const { 
    services, 
    isLoading, 
    addService, 
    updateService, 
    subscribeToServices, 
    deleteServiceSafe 
  } = useServiceStore();

  // Local UI State
  const [editingId, setEditingId] = useState(null);
  const [tempData, setTempData] = useState(null);
  const [popup, setPopup] = useState({ message: "", type: "info" });
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  // 1. PERFORMANCE: Memoized sorted services so active ones stay on top
  const sortedServices = useMemo(() => {
    if (!services) return [];
    return [...services].sort((a, b) => {
      if (a.is_active === b.is_active) return 0;
      return a.is_active ? -1 : 1;
    });
  }, [services]);

  // Sync Services from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToServices();
    return () => unsubscribe();
  }, [subscribeToServices]);

  // Manage Loading State with a slight delay to prevent flickering
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

  const triggerPopup = useCallback((message, type = "error") => {
    setPopup({ message, type });
  }, []);

  // 2. SECURITY & VALIDATION: Handle Save (Add or Update)
  const handleSave = async (id) => {
    if (!tempData?.name?.trim()) return triggerPopup("Service name is required");
    
    // Explicitly handle "0" while catching negatives or NaNs
    const priceStr = String(tempData.price_per_kg ?? "").trim();
    if (priceStr === "") return triggerPopup("Service price is required");
    
    const price = Number(priceStr);
    if (isNaN(price) || price < 0) return triggerPopup("Invalid price. Must be 0 or greater.");

    try {
      let result = false;
      // Sanitize object before DB write
      const sanitizedData = { 
        ...tempData, 
        name: tempData.name.trim(),
        price_per_kg: price 
      };

      if (id === "new_draft") {
        const { id: _, ...cleanData } = sanitizedData; 
        result = await addService(cleanData); 
      } else {
        result = await updateService(id, sanitizedData);
      }

      if (result) {
        setEditingId(null);
        setTempData(null);
        return true; 
      }
      return false;
    } catch (err) {
      console.error("Save Operation Failed:", err); 
      triggerPopup("Failed to save service. Check your connection.");
      return false;
    }
  };

  // Handle Status Toggle
  const toggleStatus = async (id, currentStatus) => {
    return await updateService(id, { is_active: !currentStatus });
  };

  // Initialize New Service Form
  const addNewService = () => {
    if (editingId) return; 
    setEditingId("new_draft");
    setTempData({ 
      name: "", 
      type: "wash_only", 
      price_per_kg: 0, 
      duration_hours: 24, 
      is_active: true 
    });
    // Scroll to top so they see the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading && shouldShowSkeleton) {
    return <ServicesSkeleton />;
  }

  return (
    <StoreGuard> 
        <div className="min-h-screen bg-app-light p-2">
   
      <LoginPopup 
        message={popup.message} 
        type={popup.type} 
        onClose={() => setPopup({ ...popup, message: "" })} 
      />

      <div className="max-w-6xl mx-auto px-1 md:px-2">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-3">
          <div> 
            <h1 className="text-h2 font-bold text-text-dark">Services</h1>
            <p className="text-sm-text text-gray-600 mt-0.5 font-normal">Manage your shop's offerings</p>
          </div>
          <button 
            onClick={addNewService} 
            disabled={editingId !== null}
            className="group flex items-center justify-center w-9 h-9 shadow-md bg-white rounded-xl border border-text-dark/20 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-app-dark"
            title="Add Service"
            aria-label="Add new service"
          >
            <IconGridPlus className="w-4 h-4 text-black" strokeWidth={2.2} />
          </button>
        </div>

        <LayoutGroup>
          {/* New Service Draft Form (Instant Snap - No AnimatePresence) */}
          {editingId === "new_draft" && (
            <div className="mb-4 relative z-[50]">
              <div className="flex items-center gap-2 mb-2 ml-1">
                <div className="w-0.5 h-3 bg-app-dark/80 rounded-full" aria-hidden="true" />
                <span className="text-sm-text  text-text-dark/80">Add New Service</span>
              </div>
              <ServiceCard 
                service={tempData} 
                isEditing={true}
                tempData={tempData} 
                setTempData={setTempData}
                onSave={() => handleSave("new_draft")}
                onCancel={() => {
                  setEditingId(null);
                  setTempData(null);
                }}
              />
            </div>
          )}

          {/* Loyalty Settings Panel */}
          <div className="relative z-[20] mb-3">
            <LoyaltySettings />
          </div>

          {/* List of Services (Instant Snap - No AnimatePresence/motion.div wrappers) */}
          <div className="grid gap-3 relative z-[10]">
            {sortedServices.map((service) => (
              <div key={service.id}>
                <ServiceCard 
                  service={service} 
                  isEditing={editingId === service.id}
                  tempData={tempData}
                  setTempData={setTempData}
                  onEdit={(s) => { 
                    setEditingId(s.id); 
                    setTempData({ ...s }); 
                  }} 
                  onSave={() => handleSave(service.id)}
                  onCancel={() => {
                    setEditingId(null);
                    setTempData(null);
                  }}
                  onToggle={() => toggleStatus(service.id, service.is_active)} 
                  onDelete={(id) => deleteServiceSafe(id)}
                />
              </div>
            ))}
            
            {sortedServices.length === 0 && editingId !== "new_draft" && (
               <div className="py-12 text-center border-1 border-dashed border-gray-200 rounded-2xl bg-white mt-4">
                 <p className="text-sm-text  text-gray-500">No services found.</p>
                 <button onClick={addNewService} className="text-blue-600 font-bold text-sm-text hover:underline mt-1 outline-none">
                   Add your first service
                 </button>
               </div>
            )}
          </div>
        </LayoutGroup>
      </div>
   
     </div>
      </StoreGuard>
  );
}