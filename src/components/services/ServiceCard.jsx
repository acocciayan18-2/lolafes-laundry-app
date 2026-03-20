import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion"; 
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { Badge, Button, Input } from "../../pages/Services";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore"; 
import {
  IconArrowUp,
  IconCheckWhite,
  IconEdit2,
  IconPackage,
  IconPlus,
  IconTrash,
  IconX
} from "../icons";

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

const MAX_SERVICE_NAME_LENGTH = 100;

const safeMoney = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = Number(cleaned);
  return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
};

// ==========================================
// ATOMIC COMPONENTS
// ==========================================

const HeadlessServiceSelect = React.memo(({ id, value, onChange, optionsMap }) => {
  const currentLabel = optionsMap[value] || "Select Type";
  const optionsList = useMemo(() => Object.entries(optionsMap).map(([key, label]) => ({ key, label })), [optionsMap]);

  return (
    <div className="relative w-full z-50">
      <Listbox value={value} onChange={onChange}>
        {({ open }) => (
          <>
            <ListboxButton 
              id={id}
              className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-sm-text font-medium focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-900 transition-colors
                ${open ? "border-gray-900 ring-1 ring-gray-900" : "border-slate-200 hover:border-gray-300"}
              `}
            >
              <span className="truncate text-text-dark">{currentLabel}</span>
              <IconArrowUp className={`w-3.5 h-3.5 text-text-dark/60 transition-transform duration-200 ${open ? 'rotate-0' : 'rotate-180'}`} aria-hidden="true" />
            </ListboxButton>
            
            <AnimatePresence>
              {open && (
                <ListboxOptions
                  static
                  as={motion.ul}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-xl z-[999] overflow-hidden py-2 p-3 max-h-60 overflow-y-auto custom-scrollbar focus:outline-none"
                >
                  {optionsList.map((opt) => (
                    <ListboxOption
                      key={opt.key}
                      value={opt.key}
                      className={({ active }) => 
                        `w-full px-3 py-2 mb-1 text-left text-sm-text flex items-center justify-between transition-colors cursor-pointer rounded-md font-medium text-text-dark ${
                          active ? 'bg-gray-50' : ''
                        }`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className="truncate">{opt.label}</span>
                          {selected && <IconCheckWhite className="w-3.5 h-3.5 text-blue-600 fill-current shrink-0" aria-hidden="true" />}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              )}
            </AnimatePresence>
          </>
        )}
      </Listbox>
    </div>
  );
});
HeadlessServiceSelect.displayName = "HeadlessServiceSelect";

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ServiceCard({ 
  service, 
  isEditing, 
  tempData, 
  setTempData, 
  onEdit, 
  onSave, 
  onCancel, 
  onToggle, 
  onDelete 
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const isMounted = useRef(false);

  const logActivity = useActivityStore((state) => state.logActivity);
  const showNotification = useNotificationStore((state) => state.showNotification);

  const containerBase = "w-full rounded-xl border px-4 py-2 shadow-sm";
  const isNew = !service?.id;

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handleAction = useCallback(async (actionFn, id, data) => {
    if (isProcessing) return; 
    setIsProcessing(true);
    
    try {
      if (typeof actionFn !== 'function') throw new Error("Action handler missing.");
      
      const result = await actionFn(id, data);
      
      if (result !== false) {
        const LOG_SUBJECT = `SVC-${id || 'NEW'}`;

        const logData = {
          customer_name: data?.name || service?.name || "Unknown Service",
          total_amount: data?.price_per_kg ?? service?.price_per_kg ?? 0, 
          order_number: LOG_SUBJECT
        };

        if (actionFn === onSave) {
          showNotification(isNew ? "Service created successfully!" : "Service updated!", "success");
          
          if (isNew) {
            logActivity(logData, 'pending', { action: 'created', label: 'Service Created' });
          } else {
            const changes = [];
            if (data.name !== service.name) changes.push("Name");
            if (data.type !== service.type) changes.push("Type");
            if (Number(data.price_per_kg) !== Number(service.price_per_kg)) changes.push("Price");
            
            if (changes.length > 0) {
              const descriptiveLabel = `${changes.join(" & ")} Updated`;
              logActivity(logData, 'in_progress', { action: 'status_update', label: descriptiveLabel });
            }
          }
        } else if (actionFn === onToggle) {
          const newState = !service.is_active;
          showNotification(newState ? "Service enabled!" : "Service disabled!", "success");
          logActivity(logData, newState ? 'ready' : 'picked_up', { action: 'status_update', label: newState ? 'Service Enabled' : 'Service Disabled' });
        } else if (actionFn === onDelete) {
          showNotification("Service deleted permanently.", "success");
          logActivity(logData, 'picked_up', { action: 'status_update', label: 'Service Deleted' });
        }
      }
      
      if (isMounted.current) setShowConfirmDelete(false);

    } catch (err) {
      console.error("[ServiceCard] Action error:", err);
      if (isMounted.current) showNotification("Action failed. Please try again.", "error");
    } finally {
      if (isMounted.current) setIsProcessing(false);
    }
  }, [isProcessing, service, isNew, onSave, onToggle, onDelete, logActivity, showNotification]);

  const validateAndSave = useCallback(() => {
    if (!tempData?.name || tempData.name.trim() === "") {
      showNotification("Service name is required.", "error");
      return;
    }
    
    // Support fallback from UI input
    const rawPrice = tempData.price_per_kg ?? tempData.price; 
    const priceStr = String(rawPrice).trim();
    
    if (priceStr === "") {
      showNotification("Service price is required.", "error");
      return;
    }

    const price = safeMoney(priceStr);
    if (price <= 0 && priceStr !== "0") {
      showNotification("Price cannot be empty or invalid.", "error");
      return;
    }

    // ✨ FIX: Strictly construct the sanitized data using the correct schema keys
    const sanitizedData = {
      ...tempData,
      name: tempData.name.trim().replace(/[<>]/g, '').substring(0, MAX_SERVICE_NAME_LENGTH),
      price_per_kg: price, 
      type: tempData.type || tempData.category || 'wash_dry' 
    };

    // Clean up incorrect keys before sending to backend to prevent DB bloat
    delete sanitizedData.price;
    delete sanitizedData.category;

    handleAction(onSave, service?.id, sanitizedData);
  }, [tempData, service?.id, onSave, handleAction, showNotification]);


  // --- RENDERS ---

  if (!service) return null;

  if (showConfirmDelete) {
    return (
      <article className={`${containerBase} border-app-dark/20 bg-app-light p-4 relative z-0`} aria-live="polite">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-rose-600 p-2 rounded-lg shrink-0" aria-hidden="true">
              <IconTrash className="w-5 h-5 text-white stroke-white" />
            </div>
            <div>
              <h3 className="text-sm-text font-medium text-text-dark">Delete this service?</h3>
              <p className="text-sm-text text-rose-700 font-medium truncate" title={`Remove ${service.name}`}>
                This will permanently remove {service.name}.
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDelete(false)} 
              disabled={isProcessing}
              className="flex-1 !text-text-dark md:w-24 border-1 !border-app-dark text-sm-text font-medium h-9 active:scale-95 transition-transform focus:outline-none focus-visible:ring-1 focus-visible:ring-app-dark" 
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleAction(onDelete, service.id, service)} 
              disabled={isProcessing}
              className="flex-1 md:w-32 !bg-rose-600 text-white text-sm-text font-medium h-9 shadow-sm active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-wait focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-600 focus-visible:ring-offset-2" 
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </article>
    );
  }

  if (isEditing) {
    return (
      <form 
        onSubmit={(e) => { e.preventDefault(); validateAndSave(); }}
        className={`${containerBase} border-app-dark/20 bg-white py-3 pt-2 relative z-20`}
        aria-label={isNew ? "Create New Service" : `Edit Service ${service.name}`}
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex-1 w-full space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1">
              
              <div className="space-y-1">
                <label htmlFor={`service-name-${service.id || 'new'}`} className="text-micro font-medium text-text-dark/60 ml-1">Service Name</label>
                <Input 
                  id={`service-name-${service.id || 'new'}`}
                  value={tempData?.name || ""} 
                  onChange={(e) => {
                    if (typeof setTempData === 'function') {
                      setTempData({...tempData, name: e.target.value.substring(0, MAX_SERVICE_NAME_LENGTH)});
                    }
                  }} 
                  className="focus:ring-1 " 
                  placeholder="e.g. Wash & Fold"
                  disabled={isProcessing}
                  required
                />
              </div>

              <div className="space-y-1 relative z-20">
                <label htmlFor={`service-type-${service.id || 'new'}`} className="text-micro font-medium text-text-dark/60 ml-1">Service Type</label>
                <HeadlessServiceSelect 
                  id={`service-type-${service.id || 'new'}`}
                  value={tempData?.type || tempData?.category || "wash_dry"} 
                  optionsMap={SERVICE_TYPE_LABELS} 
                  onChange={(newValue) => {
                    if (typeof setTempData === 'function') setTempData({...tempData, type: newValue});
                  }} 
                />
              </div>

              <div className="space-y-1 relative z-10">
                <label htmlFor={`service-price-${service.id || 'new'}`} className="text-micro font-medium text-text-dark/60 ml-1">Price (₱)</label>
                <Input 
                  id={`service-price-${service.id || 'new'}`}
                  type="text" 
                  inputMode="decimal"
                  value={tempData?.price_per_kg ?? tempData?.price ?? ""} 
                  onChange={(e) => {
                    if (typeof setTempData !== 'function') return;
                    const val = e.target.value.replace(/[^0-9.]/g, '').substring(0, 10);
                    if ((val.match(/\./g) || []).length <= 1) {
                      setTempData({...tempData, price_per_kg: val}); 
                    }
                  }} 
                  className="focus:ring-1 " 
                  placeholder="0.00"
                  disabled={isProcessing}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-1.5 w-full md:w-auto relative z-0 mt-2 md:mt-0">
            <Button 
              type="submit"
              variant="success" 
              disabled={isProcessing}
              className="flex-1 md:w-28 text-sm-text font-medium bg-green-700 text-white hover:bg-green-800 disabled:opacity-70 disabled:cursor-wait focus:outline-none focus-visible:ring-1 focus-visible:ring-green-700 focus-visible:ring-offset-2" 
            >
              {isProcessing ? (
                <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin mx-auto" aria-hidden="true" />
              ) : (
                <>{isNew ? <IconPlus className="w-3.5 h-3.5 mr-1 stroke-white text-white" aria-hidden="true" /> : <IconCheckWhite className="w-3.5 h-3.5 mr-1" aria-hidden="true" />}{isNew ? "Add" : "Save"}</>
              )}
            </Button>
            <Button 
              type="button"
              variant="outline" 
              onClick={onCancel} 
              disabled={isProcessing}
              className="flex-1 md:w-28 text-sm-text font-medium disabled:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-app-dark" 
            >
              <IconX className="w-4 h-4 mr-1" aria-hidden="true" /> Cancel
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <article className={`${containerBase} ${service.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200'} !py-4 flex items-center relative z-0`}>
      <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4">
        
        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg flex items-center shadow-hollow justify-center border shrink-0 bg-app-light" aria-hidden="true">
              <IconPackage className="w-5 h-5 text-text-dark stroke-text-dark" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm-text font-bold text-text-dark truncate" title={service.name}>{service.name}</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge className="bg-blue-100/50 text-blue-700 border-blue-200 px-3 py-0.5 truncate max-w-fit">
                  {SERVICE_TYPE_LABELS[service.type || service.category] || service.type || service.category}
                </Badge>
                <Badge className="bg-white text-gray-600 border-gray-200 px-2 font-bold ">
                  ₱{Number(service.price_per_kg ?? service.price).toFixed(2)}
                </Badge>
                <Badge className={`py-0.5 !capitalize !border-0 ${service.is_active ? ' text-emerald-600 ' : ' text-rose-600 '}`}>
                  {service.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center justify-end gap-4 shrink-0 w-full md:w-auto">
          {service.is_active ? (
            <Button 
              type="button"
              variant="outline" 
              onClick={() => onEdit(service)}
              className="text-sm-text font-medium px-3 border-gray-100 hover:bg-app-dark/5 transition-colors active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-app-dark" 
            >
              <IconEdit2 className="w-3 h-3 mr-1" aria-hidden="true" /> Edit
            </Button>
          ) : (
            <Button 
              type="button"
              onClick={() => setShowConfirmDelete(true)} 
              aria-label={`Permanently delete ${service.name}`}
              className="px-2.5 py-1 bg-transparent text-rose-600 shrink-0 hover:bg-rose-50 hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 rounded-md transition-colors"
            >
              <IconTrash className="w-5 h-5 text-text-dark/80 stroke-text-dark/80 hover:text-rose-600 hover:stroke-rose-600 transition-colors" aria-hidden="true" />
            </Button>
          )}

          <div className="w-px h-6 bg-slate-200 hidden md:block" aria-hidden="true"></div>

          <button
            type="button"
            role="switch"
            aria-checked={service.is_active}
            aria-label={`Toggle ${service.name} status`}
            onClick={() => handleAction(onToggle, service.id, service)}
            disabled={isProcessing}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-app-dark focus-visible:ring-offset-2 disabled:opacity-50 flex-shrink-0 ${
              service.is_active ? 'bg-emerald-500' : 'bg-rose-600'
            }`}
          >
            <motion.div
              animate={{ x: service.is_active ? 26 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm flex items-center justify-center"
              aria-hidden="true"
            >
              {isProcessing && <div className="w-2.5 h-2.5 border border-slate-300 border-t-emerald-500 rounded-full animate-spin" />}
            </motion.div>
          </button>
        </div>
        
      </div>
    </article>
  );
}