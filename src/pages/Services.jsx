import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { IconGridPlus, IconShirt } from "../components/icons";
import LoyaltySettings from "../components/services/LoyaltySettings";
import ServiceCard from "../components/services/ServiceCard";
import { ServicesSkeleton } from "../components/skeleton-loader";
import { useServiceStore } from "../store/services/useServiceStore";
import { LoginPopup } from "../modal/LoginPopup"; 

// TOUR
import { useLocation, useNavigate } from 'react-router-dom';
import { startGlobalTour } from '../tours/globalTours';

const SMOOTH_TRANSITION = { type: "spring", stiffness: 300, damping: 30, mass: 1 };

// --- ADDED 'export' TO THESE HELPERS TO FIX YOUR ERRORS ---

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
    className={`flex h-10 w-full rounded-lg border font-medium border-slate-200 bg-white px-3 py-2 text-base-text placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-app-dark/70 ${className}`}
    {...props}
  />
);

export const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-micro font-bold border uppercase ${className}`}>
    {children}
  </span>
);

// --- MAIN PAGE COMPONENT ---

export default function Services() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { 
    services, 
    isLoading, 
    addService, 
    updateService, 
    subscribeToServices, 
    deleteServiceSafe 
  } = useServiceStore();

  const [editingId, setEditingId] = useState(null);
  const [tempData, setTempData] = useState(null);
  const [popup, setPopup] = useState({ message: "", type: "info" });
  const [allowOverflow, setAllowOverflow] = useState(false);
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const isTourActive = searchParams.get('tour') === 'active';
  const showDummyCard = isTourActive && (isLoading || services.length === 0);

  useEffect(() => {
    if (isTourActive && !isLoading) {
      const timer = setTimeout(() => {
        startGlobalTour(navigate);
      }, 1200); 
      return () => clearTimeout(timer);
    }
  }, [location.search, isLoading, navigate, isTourActive]);

  useEffect(() => {
    const unsubscribe = subscribeToServices();
    return () => unsubscribe();
  }, [subscribeToServices]);

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 400);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleSave = async (id) => {
    if (!tempData.name.trim()) return setPopup({message: "Name required", type: "error"});
    const price = parseFloat(tempData.price_per_kg);
    if (isNaN(price) || price <= 0) return setPopup({message: "Invalid price", type: "error"});

    try {
      let result = id === "new_draft" 
        ? await addService({ ...tempData, price_per_kg: price }) 
        : await updateService(id, { ...tempData, price_per_kg: price });

      if (result) {
        setEditingId(null);
        setTempData(null);
      }
    } catch (err) {
      setPopup({message: "Save failed", type: "error"});
    }
  };

  const addNewService = () => {
    if (editingId) return;
    setEditingId("new_draft");
    setTempData({ name: "", type: "wash_only", price_per_kg: 0, duration_hours: 24, is_active: true });
  };

  if (isLoading && shouldShowSkeleton && !isTourActive) {
    return <ServicesSkeleton />;
  }

  return (
    <div className="min-h-screen bg-app-light p-2">
      <LoginPopup 
        message={popup.message} 
        type={popup.type} 
        onClose={() => setPopup({ ...popup, message: "" })} 
      />

      <motion.div layoutRoot className="max-w-6xl mx-auto px-1 md:px-2">
        <div className="flex justify-between items-center mb-3">
          <div> 
            <h1 className="text-h2 font-bold text-text-dark">Services</h1>
            <p className="text-sm-text text-gray-600 mt-0.5">Manage your shop's offerings</p>
          </div>
          <button 
            id="step-add-service"
            onClick={addNewService} 
            className="group flex items-center justify-center w-10 h-10 shadow-md bg-white rounded-xl border border-text-dark/20 active:scale-95 hover:bg-app-dark/5 transition-all"
          >
            <IconGridPlus className="w-5 h-5 text-black" strokeWidth={2.2} />
          </button>
        </div>

        <LayoutGroup>
          <AnimatePresence mode="wait">
            {editingId === "new_draft" && (
              <motion.div 
                key="new-service-form"
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                exit={{ opacity: 0, height: 0 }} 
                onAnimationComplete={() => setAllowOverflow(true)}
                transition={SMOOTH_TRANSITION}
                style={{ overflow: allowOverflow ? "visible" : "hidden" }}
                className="mb-4 relative z-[50]" 
              >
                <ServiceCard 
                  service={tempData} isEditing={true}
                  tempData={tempData} setTempData={setTempData}
                  onSave={() => handleSave("new_draft")}
                  onCancel={() => { setEditingId(null); setTempData(null); }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div id="step-loyalty-config" className="relative z-[40] mb-3">
            <LoyaltySettings />
          </div>

          <div className="grid gap-3 relative z-[10]">
            <AnimatePresence mode="popLayout">
              {services.map((service, index) => (
                <motion.div 
                  key={service.id} 
                  layout 
                  transition={SMOOTH_TRANSITION}
                  id={index === 0 ? "step-service-card-0" : undefined}
                >
                  <ServiceCard 
                    service={service} 
                    isEditing={editingId === service.id}
                    tempData={tempData}
                    setTempData={setTempData}
                    onEdit={(s) => { setEditingId(s.id); setTempData({ ...s }); }} 
                    onSave={() => handleSave(service.id)}
                    onCancel={() => { setEditingId(null); setTempData(null); }}
                    onToggle={() => updateService(service.id, { is_active: !service.is_active })} 
                    onDelete={(id) => deleteServiceSafe(id)}
                  />
                </motion.div>
              ))}

              {showDummyCard && (
                <motion.div
                  key="dummy-service"
                  id="step-service-card-0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-white p-4 rounded-xl border-2 border-dashed border-app-dark/20 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 opacity-60">
                    <div className="w-10 h-10 rounded-xl bg-app-dark/5 flex items-center justify-center">
                      <IconShirt className="w-5 h-5 text-app-dark/30" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm-text">Example Service</h3>
                      <p className="text-micro font-medium text-app-dark/40">₱0.00 per kg</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-app-dark/5 text-micro font-bold text-app-dark/30 uppercase">
                    Sample
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}