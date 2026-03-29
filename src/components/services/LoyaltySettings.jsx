import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useLoyaltyStore } from "../../store/services/useLoyaltyStore";
import { useServiceStore } from "../../store/services/useServiceStore";
import { IconArrowUp, IconGift } from "../icons";
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import Button from '../ui/Button';


const Label = React.memo(({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="text-micro  text-text-dark/60 block mb-1.5 ml-1">
    {children}
  </label>
));
Label.displayName = "Label";

const Input = React.memo(({ id, type = "text", value, onChange, disabled, className = "", placeholder, inputMode }) => (
  <input
    id={id}
    type={type}
    value={value}
    onChange={onChange}
    disabled={disabled}
    placeholder={placeholder}
    inputMode={inputMode}
    className={`flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base-text  focus:outline-none focus:ring-1 focus:ring-app-dark/90  disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
  />
));
Input.displayName = "Input";

const Switch = React.memo(({ checked, onCheckedChange, id, ariaLabel }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark focus-visible:ring-offset-2 ${checked ? 'bg-emerald-500' : 'bg-slate-300 hover:bg-slate-400'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      aria-hidden="true"
    />
  </button>
));
Switch.displayName = "Switch";

const HeadlessSelect = React.memo(({ id, value, onChange, options, disabled }) => {
  const selectedOption = useMemo(() => {
    return options.find(o => o.name === value) || { id: 'none', name: value || "Select Service" };
  }, [options, value]);

  return (
    <div className="relative w-full z-20">
      <Listbox value={selectedOption} onChange={(opt) => onChange(opt.name)} disabled={disabled}>
        {({ open }) => (
          <>
            <ListboxButton
              id={id}
              className={`flex h-10 w-full items-center justify-between rounded-xl border px-3 py-2 text-sm-text  focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark transition-colors
                ${open ? "bg-white border-app-dark" : "border-slate-200 hover:border-gray-300 bg-white"}
                ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50 hover:border-slate-200" : "cursor-pointer"}
              `}
            >
              <span className={`block truncate ${value ? "text-text-dark" : "text-slate-400"}`}>
                {selectedOption.name}
              </span>
              <IconArrowUp className={`w-4 h-4 text-text-dark transition-transform duration-200 ${open ? 'rotate-0' : 'rotate-180'}`} aria-hidden="true" />
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
                  className="absolute mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-xl border border-gray-100 focus:outline-none custom-scrollbar z-50"
                >
                  {options.length > 0 ? (
                    options.map((option) => (
                      <ListboxOption
                        key={option.id}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-2.5 px-3 text-sm-text  transition-colors flex items-center justify-between ${active ? 'bg-gray-50 text-text-dark' : 'text-text-dark'
                          }`
                        }
                        value={option}
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-bold' : ''}`}>
                              {option.name}
                            </span>
                            {selected && (
                              <svg className="h-3.5 w-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </>
                        )}
                      </ListboxOption>
                    ))
                  ) : (
                    <li className="px-3 py-3 text-center text-nano font-bold text-slate-400 uppercase">
                      No Active Services Found!
                    </li>
                  )}
                </ListboxOptions>
              )}
            </AnimatePresence>
          </>
        )}
      </Listbox>
    </div>
  );
});
HeadlessSelect.displayName = "HeadlessSelect";


// ==========================================
// MAIN COMPONENT
// ==========================================

export default function LoyaltySettings() {
  // --- GLOBAL STATE ---
  const { loyaltySettings, saveLoyaltySettings, subscribeToLoyalty, isLoading } = useLoyaltyStore();
  const { services, subscribeToServices } = useServiceStore();
  const logActivity = useActivityStore((state) => state.logActivity);
  const showNotification = useNotificationStore((state) => state.showNotification);

  // --- LOCAL STATE ---
  const [localSettings, setLocalSettings] = useState(loyaltySettings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // --- REFS ---
  const isMounted = useRef(false);

  // ✨ FIX: Get user role
  const userRole = localStorage.getItem("userRole") || "STAFF";
  const isOwner = userRole === "OWNER" || userRole === "ADMIN";

  // --- LIFECYCLE ---
  useEffect(() => {
    isMounted.current = true;
    const unsubL = typeof subscribeToLoyalty === 'function' ? subscribeToLoyalty() : () => { };
    const unsubS = typeof subscribeToServices === 'function' ? subscribeToServices() : () => { };

    return () => {
      isMounted.current = false;
      unsubL();
      unsubS();
    };
  }, [subscribeToLoyalty, subscribeToServices]);

  useEffect(() => {
    if (!isLoading && loyaltySettings) {
      setLocalSettings(loyaltySettings);
    }
  }, [loyaltySettings, isLoading]);


  // --- DERIVED STATE (MEMOIZED) ---
  const activeServices = useMemo(() => {
    if (!Array.isArray(services)) return [];
    return services.filter(s => s?.is_active);
  }, [services]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(localSettings) !== JSON.stringify(loyaltySettings);
  }, [localSettings, loyaltySettings]);

  const isValid = useMemo(() => {
    const req = Number(localSettings?.orders_required);
    return !isNaN(req) && req > 0 && typeof localSettings?.free_service_type === 'string' && localSettings.free_service_type.trim() !== "";
  }, [localSettings]);


  // --- HANDLERS ---

  const handleInputChange = useCallback((field, rawValue) => {
    // SECURITY: Ensure output is strictly numeric string, cap length to prevent bloat
    let val = String(rawValue).replace(/\D/g, "").substring(0, 4);
    if (val.length > 0) val = String(Number(val)); // Trims leading zeros safely
    setLocalSettings(prev => ({ ...prev, [field]: val }));
  }, []);

  const handleSelectChange = useCallback((val) => {
    setLocalSettings(prev => ({ ...prev, free_service_type: val }));
  }, []);

  const executeStatusChange = useCallback(async (newStatus, wipePoints = false) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const updated = { ...localSettings, is_enabled: newStatus };
      await saveLoyaltySettings(updated, wipePoints);

      const labelText = newStatus ? "Voucher Enabled" : wipePoints ? "Voucher Reset & Disabled" : "Voucher Paused";

      logActivity({ customer_name: "Voucher", order_number: "SETTINGS", total_amount: 0 },
        newStatus ? 'ready' : 'picked_up',
        { action: 'status_update', label: labelText }
      );

      if (isMounted.current) {
        setLocalSettings(updated);
        setShowConfirmDialog(false);
        showNotification(labelText, "success");
      }
    } catch (err) {
      if (isMounted.current) {
        showNotification("Failed to update status", "error");
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  }, [localSettings, saveLoyaltySettings, logActivity, showNotification, isSaving]);

  const handleToggle = useCallback((checked) => {
    if (checked) {
      executeStatusChange(true);
    } else {
      setShowConfirmDialog(true);
    }
  }, [executeStatusChange]);

  const handleCancelDisable = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving || !hasChanges || !isValid) return;

    setIsSaving(true);
    try {
      const changes = [];
      if (localSettings.free_service_type !== loyaltySettings.free_service_type) changes.push("Reward Service");
      if (Number(localSettings.orders_required) !== Number(loyaltySettings.orders_required)) changes.push("Visit Threshold");

      if (changes.length === 0) {
        showNotification("No changes detected.", "info");
        setIsSaving(false);
        return;
      }

      // Sanitize the payload exactly before transmission
      const payload = {
        ...localSettings,
        orders_required: Math.max(1, Number(localSettings.orders_required))
      };

      await saveLoyaltySettings(payload);

      logActivity({ customer_name: "Voucher", order_number: "CONFIG", total_amount: 0 }, 'in_progress', {
        action: 'status_update', label: `${changes.join(" & ")} Updated`
      });

      if (isMounted.current) {
        showNotification("Voucher updated successfully!", "success");
      }
    } catch (err) {
      if (isMounted.current) {
        showNotification("Failed to update voucher.", "error");
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  }, [isSaving, hasChanges, isValid, localSettings, loyaltySettings, saveLoyaltySettings, logActivity, showNotification]);

  // --- RENDER EARLY RETURN ---
  if (isLoading) return null;

  // --- RENDER ---
  return (
    <section className="w-full relative z-10" aria-label="Loyalty Program Settings">
      <AnimatePresence mode="wait">
        {showConfirmDialog ? (
          <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="w-full bg-white border border-slate-200 shadow-xl rounded-xl p-4 flex flex-col items-center text-center"
            role="alertdialog"
            aria-labelledby="disable-voucher-title"
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4 text-amber-600" aria-hidden="true">
              <IconGift className="w-6 h-6" />
            </div>
            <h3 id="disable-voucher-title" className="text-xl font-extrabold text-text-dark mb-1">Disable Voucher?</h3>
            <p className="text-sm-text text-text-dark/80 max-w-sm leading-relaxed mb-3">
              Choose how to handle existing customer points. You can resume them later or clear them entirely.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              <Button
                variant="secondary"
                onClick={() => executeStatusChange(false, false)}
                disabled={isSaving}
                className="!h-auto flex-col !items-center !p-3"
              >
                <span className="font-bold text-sm-text">Pause Progress</span>
                <span className="text-micro font-normal text-text-dark/70">Keep customer points saved</span>
              </Button>
              <Button
                variant="danger"
                onClick={() => executeStatusChange(false, true)}
                disabled={isSaving}
                className="!h-auto flex-col !items-center !p-3"
              >
                <span className="font-bold text-sm-text text-white">Reset Everything</span>
                <span className="text-micro font-normal text-white/80">Clear all points to zero</span>
              </Button>
            </div>
            <button
              onClick={handleCancelDisable}
              className="mt-2 h-11 px-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark text-sm-text font-normal text-text-dark/80 hover:text-text-dark hover:underline"
            >
              Nevermind, keep it active
            </button>
          </motion.div>
        ) : (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col md:flex-row bg-white border border-slate-200 shadow-sm rounded-xl"
          >
            <div className="flex-1 p-4 rounded-t-xl md:rounded-l-xl bg-white">
              <header className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`border w-9 h-9 rounded-lg flex items-center justify-center shadow-hollow transition-colors ${localSettings?.is_enabled ? 'bg-app-light' : 'bg-slate-100'}`} aria-hidden="true">
                    <IconGift className={`w-5 h-5 ${localSettings?.is_enabled ? 'text-teal-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-h3 font-bold text-text-dark">Customer Loyalty</h3>
                    <div className="flex items-center gap-1.5 mt-0.5" aria-live="polite">
                      <span className={`w-1.5 h-1.5 rounded-full ${localSettings?.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} aria-hidden="true"></span>
                      <span className={`text-nano font-bold uppercase ${localSettings?.is_enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {localSettings?.is_enabled ? 'Promo Active' : 'Promo Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* ✨ FIX: Only render Switch for Owner */}
                {isOwner && (
                  <Switch
                    id="loyalty-toggle"
                    checked={!!localSettings?.is_enabled}
                    onCheckedChange={handleToggle}
                    ariaLabel="Toggle Loyalty Program Status"
                  />
                )}
              </header>

              <fieldset className={`space-y-4 border-none p-0 m-0 ${!localSettings?.is_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <legend className="sr-only">Loyalty Program Configuration</legend>
                <div className="space-y-0.5 relative z-20">
                  <Label htmlFor="reward-service-select">Free Service Reward</Label>
                  <HeadlessSelect
                    id="reward-service-select"
                    options={activeServices}
                    value={localSettings?.free_service_type || ""}
                    onChange={handleSelectChange}
                    disabled={!isOwner || !localSettings?.is_enabled} // ✨ Disabled for Staff
                  />
                </div>
                <div className="space-y-0.5 relative z-10">
                  <Label htmlFor="orders-required-input">Orders Needed</Label>
                  <Input
                    id="orders-required-input"
                    type="text"
                    inputMode="numeric"
                    value={localSettings?.orders_required || ""}
                    onChange={(e) => handleInputChange('orders_required', e.target.value)}
                    disabled={!isOwner || !localSettings?.is_enabled} // ✨ Disabled for Staff
                  />
                </div>
              </fieldset>
            </div>

            <div className="relative flex items-center justify-center bg-white md:bg-transparent" aria-hidden="true">
              <div className="w-[calc(100%-2rem)] mx-auto h-px md:w-px md:h-[calc(100%-2rem)] border-t-2 md:border-l-2 border-dashed border-slate-300" />
            </div>

            <aside className={`w-full md:w-60 p-4 flex flex-col justify-between rounded-b-xl md:rounded-r-xl transition-colors ${localSettings?.is_enabled ? 'bg-app-light' : 'bg-slate-50'}`}>
              <div className="space-y-3 text-center">
                <h4 className={`text-nano font-bold uppercase ${localSettings?.is_enabled ? 'text-teal-600' : 'text-slate-400'}`}>Reward Summary</h4>
                <div className={`p-3 rounded-lg border border-dashed shadow-sm transition-colors ${localSettings?.is_enabled ? 'bg-white border-sky-300' : 'bg-slate-100 border-slate-300'}`}>
                  <div className="text-h3 font-bold text-text-dark" aria-hidden="true">FREE</div>
                  <div className={`text-micro font-bold uppercase truncate ${localSettings?.is_enabled ? 'text-teal-600' : 'text-slate-500'}`} title={localSettings?.free_service_type}>
                    {localSettings?.free_service_type || "No Service"}
                  </div>
                  <div className="h-px bg-slate-100 my-2" aria-hidden="true" />
                  <p className="text-micro text-slate-500 ">After {localSettings?.orders_required || 0} visits</p>
                </div>
              </div>

              {/* ✨ FIX: Only render Save button for Owner */}
              {isOwner && (
                <Button
                  variant="success"
                  onClick={handleSave}
                  disabled={!localSettings?.is_enabled || !hasChanges || !isValid || isSaving}
                  isLoading={isSaving}
                  className="mt-3 w-full !h-10 shadow-md"
                >
                  Save Ticket
                </Button>
              )}
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}