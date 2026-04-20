/**
 * @file ServiceCard.jsx
 * @description Enterprise-grade Service Management Card.
 * @security Implements strict input sanitization, bounded numeric validation, and secure in-memory RBAC.
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { Badge, Button, Input } from "../../pages/Services";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
// ✨ SECURE RBAC: Import Auth Store instead of using localStorage
import { useAuthStore } from "../../store/auth/useAuthStore"; 
import {
  IconArrowUp, IconCheckWhite, IconEdit2, IconPackage,
  IconTrash
} from "../icons";

// ==========================================
// 🛡️ CONFIGURATION & CONSTANTS
// ==========================================
const SERVICE_TYPE_LABELS = Object.freeze({
  wash_only: "Wash Only", dry_only: "Dry Only", wash_dry: "Wash & Dry",
  fold_only: "Fold Only", press_only: "Press Only", wash_fold: "Wash & Fold",
  dry_fold: "Dry & Fold", dry_press: "Dry & Press", wash_dry_fold: "Wash, Dry & Fold",
  wash_dry_press: "Wash, Dry & Press", wash_fold_press: "Wash, Fold & Press",
  full_service: "Full Service (W/D/F/P)", special_care: "Delicates / Handwash",
  bulk_items: "Bulk (Comforters/Rug)", add_on: "Add-ons & Supplies"
});

const VALIDATION_RULES = Object.freeze({
  MAX_NAME_LENGTH: 100,
  MAX_PRICE: 100000, // Prevent overflow/ridiculous pricing
  MAX_COST: 100000,
});

// ==========================================
// 🛡️ PURE FUNCTIONS & SANITIZATION
// ==========================================
const sanitizeString = (str, maxLength) => {
  if (typeof str !== 'string') return '';
  // Strip HTML tags to prevent DOM-based XSS
  return str.replace(/[<>]/g, '').trim().substring(0, maxLength);
};

const safeMoney = (val, maxLimit) => {
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = Number(cleaned);
  // Prevent NaN, negative values, and integer overflows
  if (isNaN(num) || num < 0) return 0;
  return Math.min(Math.round(num * 100) / 100, maxLimit);
};

// Extractor Utilities to handle messy legacy database schemas
const extractPrice = (data) => data?.price_per_unit ?? data?.price_per_kg ?? data?.price ?? "";
const extractCost = (data) => data?.supply_cost_per_qty ?? data?.supply_cost ?? data?.cost ?? "";

// ==========================================
// ⚛️ ATOMIC COMPONENTS
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
              aria-label="Select service category"
              className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-sm-text focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${open ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"}`}
            >
              <span className="truncate text-text-dark">{currentLabel}</span>
              <IconArrowUp className={`w-3.5 h-3.5 text-text-dark/60 transition-transform duration-200 ${open ? 'rotate-0' : 'rotate-180'}`} aria-hidden="true" />
            </ListboxButton>
            <AnimatePresence>
              {open && (
                <ListboxOptions static as={motion.ul} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute mt-1 w-full bg-white border border-slate-100 rounded-lg shadow-xl z-[999] overflow-hidden py-2 p-3 max-h-60 overflow-y-auto custom-scrollbar">
                  {optionsList.map((opt) => (
                    <ListboxOption key={opt.key} value={opt.key} className={({ active }) => `w-full px-3 py-2 mb-1 text-left text-sm-text flex items-center justify-between transition-colors cursor-pointer rounded-md text-text-dark ${active ? 'bg-slate-50' : ''}`}>
                      {({ selected }) => (
                        <>
                          <span className="truncate font-medium">{opt.label}</span>
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
// 🚀 MAIN COMPONENT
// ==========================================
export default function ServiceCard({ service, isEditing, tempData, setTempData, onEdit, onSave, onCancel, onToggle, onDelete }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isMounted = useRef(false);

  // Zustand Actions
  const showNotification = useNotificationStore((state) => state.showNotification);
  
  // ✨ SECURE RBAC: Hardened string normalization to prevent casing mismatches
  const userRole = useAuthStore((state) => state.userRole); 
  const safeRole = String(userRole || "STAFF").toUpperCase();
  const isOwner = safeRole === "OWNER" || safeRole === "ADMIN";

  const isNew = !service?.id;
  const containerBase = "w-full rounded-xl border px-4 py-2 shadow-sm transition-all";

  // Memory Leak Prevention
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handleAction = useCallback(async (actionFn, id, data) => {
    if (isProcessing) return; 
    
    // 🛡️ FRONTEND GATE: Enforce strict admin evaluation
    if (!isOwner) {
      showNotification("Unauthorized action. Admin privileges required.", "error");
      return;
    }

    setIsProcessing(true);
    try {
      if (typeof actionFn !== 'function') throw new Error("Action handler missing.");
      
      const result = await actionFn(id, data);
      
      if (result !== false && isMounted.current) {
        if (actionFn === onSave) showNotification(isNew ? "Service created!" : "Service updated!", "success");
        if (actionFn === onToggle) showNotification(!service.is_active ? "Service enabled!" : "Service disabled!", "success");
        if (actionFn === onDelete) showNotification("Service deleted.", "success");
      }
      if (isMounted.current) setShowConfirmDelete(false);
    } catch (err) {
      console.error("[ServiceCard] Action Error:", err);
      if (isMounted.current) showNotification("Action failed. Please try again.", "error");
    } finally {
      if (isMounted.current) setIsProcessing(false);
    }
  }, [isProcessing, isOwner, service, isNew, onSave, onToggle, onDelete, showNotification]);

  const validateAndSave = useCallback(() => {
    const cleanName = sanitizeString(tempData?.name, VALIDATION_RULES.MAX_NAME_LENGTH);
    if (!cleanName) return showNotification("Service name required.", "error");

    const price = safeMoney(extractPrice(tempData), VALIDATION_RULES.MAX_PRICE);
    if (price <= 0) return showNotification("Price must be greater than zero.", "error");

    const cost = safeMoney(extractCost(tempData), VALIDATION_RULES.MAX_COST);
    
    // 🛡️ STRICT QA FIX: Hard Block for negative profit margins
    if (cost >= price) {
      return showNotification("Error: Cost cannot be higher than or equal to the selling price!", "error");
    }

    const sanitizedData = {
      ...tempData,
      name: cleanName,
      // ✨ SYNC ALL LEGACY FIELDS: Prevents the database/parent from losing data
      price_per_unit: price,
      price_per_kg: price,
      price: price,
      supply_cost_per_qty: cost, 
      supply_cost: cost,
      cost: cost,
      type: tempData.type || tempData.category || 'wash_dry',
      category: tempData.type || tempData.category || 'wash_dry'
    };
    
    handleAction(onSave, service?.id, sanitizedData);
  }, [tempData, service?.id, onSave, handleAction, showNotification]);

  if (!service) return null;

  // --- UNHAPPY PATH: DELETE CONFIRMATION ---
  if (showConfirmDelete) {
    return ( 
      <article className={`${containerBase} border-rose-200 bg-rose-50 p-4 relative z-0`} aria-live="assertive">
         <div className="flex flex-col sm:flex-row justify-between py-2.5 gap-4">
             <div className="flex items-center gap-3">
                 <div className="bg-rose-600 p-2 rounded-lg" aria-hidden="true"><IconTrash className="w-5 h-5 text-white" /></div>
                 <div>
                     <h3 className="text-sm-text font-bold text-text-dark">Delete {sanitizeString(service.name, 30)}?</h3>
                     <p className="text-micro text-rose-600">This action is permanent and cannot be undone.</p>
                 </div>
             </div>
             <div className="flex gap-2 shrink-0">
                 <Button variant="outline" onClick={() => setShowConfirmDelete(false)} disabled={isProcessing} className="flex-1 sm:w-24 border-1 border-slate-300 h-9 bg-white">Cancel</Button>
                 <Button onClick={() => handleAction(onDelete, service.id, service)} disabled={isProcessing} className="flex-1 sm:w-32 bg-rose-600 hover:bg-rose-700 text-white h-9">
                   {isProcessing ? "Deleting..." : "Confirm Delete"}
                 </Button>
             </div>
         </div>
      </article>
    );
  }

  // --- EDIT MODE ---
  if (isEditing) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); validateAndSave(); }} className={`${containerBase} border-blue-200 bg-blue-50/30 py-3 pt-2 relative z-20`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex-1 w-full space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              
              <div className="space-y-1">
                <label htmlFor={`name-${service.id}`} className="text-micro font-bold text-text-dark/70 ml-1">Service Name <span className="text-rose-500">*</span></label>
                <Input id={`name-${service.id}`} value={tempData?.name || ""} onChange={(e) => setTempData({ ...tempData, name: e.target.value })} maxLength={VALIDATION_RULES.MAX_NAME_LENGTH} placeholder="e.g. Premium Wash" required aria-required="true" />
              </div>

              <div className="space-y-1 relative z-20">
                <label id={`type-label-${service.id}`} className="text-micro font-bold text-text-dark/70 ml-1">Service Category <span className="text-rose-500">*</span></label>
                <HeadlessServiceSelect id={`type-${service.id}`} value={tempData?.type || tempData?.category || "wash_dry"} optionsMap={SERVICE_TYPE_LABELS} onChange={(val) => setTempData({ ...tempData, type: val, category: val })} />
              </div>

              <div className="space-y-1 relative z-10">
                <label htmlFor={`price-${service.id}`} className="text-micro font-bold text-emerald-700 ml-1">Selling Price (₱) <span className="text-rose-500">*</span></label>
                <Input id={`price-${service.id}`} type="text" inputMode="decimal" value={extractPrice(tempData)} onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '').substring(0, 10);
                    if ((val.match(/\./g) || []).length <= 1) {
                      setTempData({ ...tempData, price_per_unit: val, price_per_kg: val, price: val });
                    }
                  }} placeholder="0.00" required aria-required="true" />
              </div>

              <div className="space-y-1 relative z-10">
                <label htmlFor={`cost-${service.id}`} className="text-micro font-bold text-rose-700 ml-1">Est. Supply Cost (₱)</label>
                <Input id={`cost-${service.id}`} type="text" inputMode="decimal" value={extractCost(tempData)} onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '').substring(0, 10);
                    if ((val.match(/\./g) || []).length <= 1) {
                      setTempData({ ...tempData, supply_cost_per_qty: val, supply_cost: val, cost: val });
                    }
                  }} placeholder="0.00" />
              </div>

            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto mt-2 lg:mt-0">
            <Button type="submit" variant="success" disabled={isProcessing} className="flex-1 lg:w-32 text-sm-text bg-emerald-600 hover:bg-emerald-700 h-10 shadow-sm">
              {isProcessing ? "Saving..." : <>{isNew ? "Create Service" : "Save Changes"}</>}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing} className="flex-1 lg:w-32 text-sm-text h-10 border-slate-300">
              Cancel
            </Button>
          </div>
        </div>
      </form>
    );
  }

  // --- READ-ONLY MODE ---
  const price = Number(extractPrice(service)) || 0;
  const cost = Number(extractCost(service)) || 0;
  const marginStr = price > 0 ? (((price - cost) / price) * 100).toFixed(0) : "0";
  const isProfitable = (price - cost) > 0;

  return (
    <article className={`${containerBase} ${service.is_active ? 'bg-white hover:border-slate-300' : ''} !py-4 flex items-center`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center shadow-sm border border-slate-200 bg-slate-50 shrink-0 justify-center" aria-hidden="true">
              <IconPackage className="w-5 h-5 text-text-dark" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base-text font-bold text-slate-800 truncate">{service.name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-0.5">
                  {SERVICE_TYPE_LABELS[service.type || service.category] || service.type}
                </Badge>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2 font-bold">
                  Price: ₱{price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Badge>
                
                {isOwner && (
                  <Badge className={`px-2 font-bold ${isProfitable ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    Cost: ₱{cost.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({marginStr}% Margin)
                  </Badge>
                )}
                
                <Badge className={`py-0.5 !border-0 ${service.is_active ? 'text-emerald-600 bg-emerald-50' : 'text-text-dark/80 bg-slate-200'}`}>
                  {service.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center justify-end gap-3 shrink-0 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            {service.is_active ? (
              <Button type="button" variant="outline" onClick={() => onEdit(service)} disabled={isProcessing} aria-label={`Edit ${service.name}`} className="text-sm-text px-3 border-slate-200 h-8 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                <IconEdit2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="button" onClick={() => setShowConfirmDelete(true)} disabled={isProcessing} aria-label={`Delete ${service.name}`} className="px-3 h-8 text-sm-text !bg-rose-50 !text-rose-600 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100 flex items-center">
                <IconTrash className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
            
           
            
            <button 
              type="button"
              role="switch" 
              aria-checked={service.is_active} 
              aria-label={`Toggle active status for ${service.name}`}
              onClick={() => handleAction(onToggle, service.id, service)} 
              disabled={isProcessing}
              className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${service.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
            >
              <motion.div animate={{ x: service.is_active ? 26 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}