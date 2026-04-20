/**
 * @file Services.jsx
 * @description Enterprise-grade Services Management Dashboard.
 * @architecture Secure Parent Controller managing ServiceCard and LoyaltySettings children.
 */
import { LayoutGroup, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { IconGridPlus } from "../components/icons";
import LoyaltySettings from "../components/services/LoyaltySettings";
import ServiceCard from "../components/services/ServiceCard";
import { ServicesSkeleton } from "../components/skeleton-loader";
import { useServiceStore } from "../store/services/useServiceStore";
import { LoginPopup } from "../modal/LoginPopup";
import StoreGuard from '../components/settings/StoreGuard';
// ✨ SECURE RBAC: Import unified memory state
import { useAuthStore } from "../store/auth/useAuthStore";

// ==========================================
// ATOMIC UI COMPONENTS
// ==========================================
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
      className={`inline-flex items-center justify-center rounded-lg  transition-all px-4 py-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 outline-none ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ className = "", ...props }) => (
  <input
    className={`flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm-text placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-app-dark/70 transition-shadow ${className}`}
    {...props}
  />
);

export const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-micro font-bold border uppercase ${className}`}>
    {children}
  </span>
);

// ==========================================
// MAIN CONTROLLER
// ==========================================
export default function Services() {
  const { services, isLoading, addService, updateService, subscribeToServices, deleteServiceSafe } = useServiceStore();

  // ✨ SECURE RBAC: Hardened memory pull preventing LocalStorage manipulation
  const userRole = useAuthStore((state) => state.userRole);
  const safeRole = String(userRole || "STAFF").toUpperCase();
  const isOwnerOrAdmin = safeRole === "OWNER" || safeRole === "ADMIN";

  // --- STATE ---
  const [editingId, setEditingId] = useState(null);
  const [tempData, setTempData] = useState(null);
  const [popup, setPopup] = useState({ message: "", type: "info" });
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  // --- DERIVED MEMOIZATION ---
  const sortedServices = useMemo(() => {
    if (!services) return [];
    return [...services].sort((a, b) => {
      if (a.is_active === b.is_active) return 0;
      return a.is_active ? -1 : 1; // Active services map to top
    });
  }, [services]);

  // --- LIFECYCLE ---
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


  // --- EVENT HANDLERS (Memoized for Performance) ---
  const triggerPopup = useCallback((message, type = "error") => {
    setPopup({ message, type });
  }, []);

  // ✨ FIX: Accepts sanitizedData from the Child Component
  const handleSave = useCallback(async (id, sanitizedData) => {
    if (!isOwnerOrAdmin) return triggerPopup("Unauthorized: Only owners can modify services.");
    
    // Merge fallback for edge-case safety
    const dataToSave = sanitizedData || tempData;
    if (!dataToSave?.name?.trim()) return triggerPopup("Service name is required");

    const price = Number(dataToSave.price_per_kg ?? dataToSave.price);
    if (isNaN(price) || price < 0) return triggerPopup("Invalid price. Must be 0 or greater.");

    try {
      let result = false;
      const isNew = !id || id === "new_draft";

      if (isNew) {
        // Strip draft ID before sending to DB
        const { id: _, ...cleanData } = dataToSave;
        result = await addService(cleanData);
      } else {
        result = await updateService(id, dataToSave);
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
  }, [isOwnerOrAdmin, tempData, addService, updateService, triggerPopup]);

  const handleEdit = useCallback((serviceRecord) => {
    if (!isOwnerOrAdmin) return;
    setEditingId(serviceRecord.id);
    setTempData({ ...serviceRecord });
  }, [isOwnerOrAdmin]);

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setTempData(null);
  }, []);

  const toggleStatus = useCallback(async (id, serviceData) => {
    if (!isOwnerOrAdmin) return;
    return await updateService(id, { is_active: !serviceData.is_active });
  }, [isOwnerOrAdmin, updateService]);

  const handleDelete = useCallback((id) => {
    if (!isOwnerOrAdmin) return;
    return deleteServiceSafe(id);
  }, [isOwnerOrAdmin, deleteServiceSafe]);

  const addNewService = useCallback(() => {
    if (editingId || !isOwnerOrAdmin) return;
    setEditingId("new_draft");
    setTempData({
      name: "",
      type: "wash_only",
      price_per_kg: 0,
      supply_cost_per_qty: 0,
      duration_hours: 24,
      is_active: true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [editingId, isOwnerOrAdmin]);


  // --- RENDER EARLY RETURN ---
  if (isLoading && shouldShowSkeleton) return <ServicesSkeleton />;

  return (
    <StoreGuard>
      <div className="min-h-screen bg-app-light p-2">
        <LoginPopup message={popup.message} type={popup.type} onClose={() => setPopup({ ...popup, message: "" })} />
        
        <div className="max-w-6xl mx-auto px-1 md:px-2">
          
          {/* HEADER */}
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-h2 font-bold text-text-dark">Services</h1>
              <p className="text-sm-text text-gray-600 mt-0.5 font-normal">Manage your shop's offerings and costs</p>
            </div>
            
            {isOwnerOrAdmin && (
              <button
                onClick={addNewService}
                disabled={editingId !== null}
                aria-label="Add new service"
                className="group flex items-center justify-center w-9 h-9 shadow-md bg-white rounded-xl border border-text-dark/20 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-app-dark active:scale-95 hover:shadow-lg disabled:opacity-50"
              >
                <IconGridPlus className="w-4 h-4 text-black" strokeWidth={2.2} />
              </button>
            )}
          </div>

          <LayoutGroup>
            
            {/* NEW DRAFT CARD */}
            <AnimatePresence>
              {editingId === "new_draft" && (
                <div className="mb-4 relative z-[50]">
                  <div className="flex items-center gap-2 mb-2 ml-1" aria-hidden="true">
                    <div className="w-0.5 h-3 bg-app-dark/80 rounded-full" />
                    <span className="text-sm-text text-text-dark/80">Add New Service</span>
                  </div>
                  <ServiceCard
                    service={tempData}
                    isEditing={true}
                    tempData={tempData}
                    setTempData={setTempData}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* LOYALTY WIDGET */}
            <div className="relative z-[20] mb-3">
              {/* ✨ Cleaned: LoyaltySettings manages its own role internally now */}
              <LoyaltySettings />
            </div>

            {/* SERVICE CARDS GRID */}
            <div className="grid gap-3 relative z-[10] pb-4" role="list">
              {sortedServices.map((service) => (
                <div key={service.id} role="listitem">
                  <ServiceCard
                    service={service}
                    isEditing={editingId === service.id}
                    tempData={tempData}
                    setTempData={setTempData}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onToggle={toggleStatus}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>

          </LayoutGroup>
        </div>
      </div>
    </StoreGuard>
  );
}