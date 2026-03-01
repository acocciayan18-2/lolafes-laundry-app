import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useMemo } from "react";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useLoyaltyStore } from "../../store/services/useLoyaltyStore";
import { useServiceStore } from "../../store/services/useServiceStore";
import { IconArrowUp, IconGift } from "../icons";
import { useNotificationStore } from '../../store/ui/useNotificationStore';

// --- UI Helpers ---
const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="text-micro font-medium text-text-dark/60 block mb-1.5 ml-1">
    {children}
  </label>
);

const Input = ({ id, type, value, onChange, disabled, className, placeholder, inputMode }) => (
  <input 
    id={id}
    type={type} 
    value={value} 
    onChange={onChange} 
    disabled={disabled}
    placeholder={placeholder}
    inputMode={inputMode}
    className={`flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base-text font-medium focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-sm disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
  />
);

const Switch = ({ checked, onCheckedChange, ariaLabel }) => (
  <button 
    type="button" 
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel || "Toggle setting"}
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900
      ${checked ? 'bg-green-700' : 'bg-slate-200'}`}
  >
    <span 
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 
        ${checked ? 'translate-x-6' : 'translate-x-1'}`} 
    />
  </button>
);

const CustomSelect = ({ value, onChange, options, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // 1. PERFORMANCE: Only attach listener when dropdown is actually open
  // 2. ACCESSIBILITY: Added Escape key support
  useEffect(() => {
    const handleOutsideClickOrEsc = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClickOrEsc);
      document.addEventListener("keydown", handleOutsideClickOrEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClickOrEsc);
      document.removeEventListener("keydown", handleOutsideClickOrEsc);
    };
  }, [isOpen]);

  return (
    <div className={`relative w-full ${isOpen ? 'z-[100]' : 'z-auto'}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-xl border bg-white px-3 py-2 text-base-text font-medium focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-900
          ${isOpen ? "border-gray-900 ring-1 ring-gray-900" : "border-slate-200 hover:border-gray-300"}
          ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "cursor-pointer"}
        `}
      >
        <span className={value ? "text-slate-800 truncate pr-2" : "text-slate-400"}>
          {value || "Select Service"}
        </span>
        <IconArrowUp className={`w-4 h-4 text-slate-800 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-0' : 'rotate-180'}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-[999] overflow-hidden py-2 p-3 animate-in fade-in zoom-in-95 duration-100"
          role="listbox"
        >
          <div className="max-h-60 custom-scrollbar overflow-y-auto pr-1">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={value === option.name}
                onClick={() => {
                  onChange(option.name);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2.5 text-left text-base-text flex items-center justify-between transition-colors hover:bg-gray-50 font-medium text-text-dark rounded-md focus:outline-none focus:bg-gray-100"
              >
                <span className="truncate pr-2">{option.name}</span>
                {value === option.name && (
                  <svg className="h-3.5 w-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-3 text-center text-nano font-bold text-slate-400 uppercase">
                No Active Services Found!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function LoyaltySettings() {
  const { loyaltySettings, saveLoyaltySettings, subscribeToLoyalty, isLoading } = useLoyaltyStore();
  const { services, subscribeToServices } = useServiceStore();
  const logActivity = useActivityStore((state) => state.logActivity);

  const [localSettings, setLocalSettings] = useState(loyaltySettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    const unsubL = subscribeToLoyalty();
    const unsubS = subscribeToServices();
    return () => { unsubL(); unsubS(); };
  }, [subscribeToLoyalty, subscribeToServices]);

  // Only sync down from cloud if we aren't currently editing (prevents overwriting unsaved changes if a random network sync happens)
  useEffect(() => {
    if (!isLoading && !hasChanges) {
      setLocalSettings(loyaltySettings);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loyaltySettings, isLoading]);

  // 3. UX FIX: Smarter Numeric Input
  const handleInputChange = (field, rawValue) => {
    // Strip non-digits
    let val = rawValue.replace(/\D/g, ""); 
    
    // If it's completely empty, allow it to be empty temporarily so the user can type a new number.
    // If it has length, use parseInt to strip leading zeros safely without converting "" to "0".
    if (val.length > 0) {
      val = String(parseInt(val, 10));
    } 
    
    setLocalSettings({ ...localSettings, [field]: val });
  };

  const executeStatusChange = async (newStatus, wipePoints = false) => {
    const { showNotification } = useNotificationStore.getState();
    setIsSaving(true);
    try {
      const updated = { ...localSettings, is_enabled: newStatus };
      await saveLoyaltySettings(updated, wipePoints);
      setLocalSettings(updated);
      
      const labelText = newStatus ? "Voucher Enabled" : wipePoints ? "Voucher Reset & Disabled" : "Voucher Paused";

      logActivity({ customer_name: "Voucher", order_number: "SETTINGS", total_amount: 0 }, 
        newStatus ? 'ready' : 'picked_up', 
        { action: 'status_update', label: labelText }
      );

      showNotification(labelText, "success");
      setShowConfirmDialog(false);
    } catch (err) {
      showNotification("Failed to update status", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (checked) => {
    if (checked) executeStatusChange(true);
    else setShowConfirmDialog(true);
  };

  const handleSave = async () => {
    const { showNotification } = useNotificationStore.getState();
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

      // Ensure we cast it back to a Number before saving to Firebase in case they left it blank
      const finalRequired = Math.max(1, Number(localSettings.orders_required) || 10);
      
      await saveLoyaltySettings({ ...localSettings, orders_required: finalRequired });

      logActivity({ customer_name: "Voucher", order_number: "CONFIG", total_amount: 0 }, 'in_progress', {
        action: 'status_update', label: `${changes.join(" & ")} Updated`
      });

      showNotification("Voucher updated successfully!", "success");
    } catch (err) {
      showNotification("Failed to update voucher.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Memoize active services so we don't filter them on every render
  const activeServices = useMemo(() => services.filter(s => s.is_active), [services]);

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(loyaltySettings);
  // Validation now explicitly ensures the string parses to a number > 0
  const isValid = Number(localSettings.orders_required) > 0 && localSettings.free_service_type !== "";

  if (isLoading) return null;

  return (
    <div className="w-full relative z-10">
      <AnimatePresence mode="wait">
        {showConfirmDialog ? (
          <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="w-full bg-white border border-slate-200 shadow-xl rounded-xl p-4 flex flex-col items-center text-center"
            role="dialog"
            aria-labelledby="confirm-dialog-title"
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4 text-amber-600">
              <IconGift className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 id="confirm-dialog-title" className="text-xl font-extrabold text-text-dark mb-1">Disable Voucher?</h3>
            <p className="text-sm-text text-text-dark/80 max-w-sm leading-relaxed mb-3">
              Choose how to handle existing customer points. You can resume them later or clear them entirely.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              <button onClick={() => executeStatusChange(false, false)} disabled={isSaving} className="flex flex-col items-center p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none transition-all disabled:opacity-50">
                <span className="font-bold text-text-dark text-sm-text">Pause Progress</span>
                <span className="text-[11px] text-text-dark/70">Keep customer points saved</span>
              </button>
              <button onClick={() => executeStatusChange(false, true)} disabled={isSaving} className="flex flex-col items-center p-3 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 outline-none transition-all disabled:opacity-50">
                <span className="font-bold text-red-600 text-sm-text">Reset Everything</span>
                <span className="text-[11px] text-red-400">Clear all points to zero</span>
              </button>
            </div>
            <button onClick={() => setShowConfirmDialog(false)} disabled={isSaving} className="mt-2 h-11 text-sm-text font-normal text-text-dark/80 hover:text-text-dark hover:underline outline-none focus-visible:ring-2 focus-visible:ring-gray-300 rounded disabled:opacity-50">
              Nevermind, keep it active
            </button>
          </motion.div>
        ) : (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col md:flex-row bg-white border border-slate-200 shadow-sm rounded-xl"
          >
            {/* LEFT SECTION */}
            <div className="flex-1 p-4 rounded-t-xl md:rounded-l-xl bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`border w-9 h-9 rounded-lg flex items-center justify-center shadow-hollow transition-colors ${localSettings.is_enabled ? 'bg-app-light' : 'bg-slate-100'}`}>
                    <IconGift className={`w-5 h-5 ${localSettings.is_enabled ? 'text-teal-600' : 'text-slate-400'}`} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-h3 font-bold text-slate-900 ">Customer Loyalty</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${localSettings.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                      <span className={`text-nano font-bold uppercase  ${localSettings.is_enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {localSettings.is_enabled ? 'Promo Active' : 'Promo Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <Switch checked={localSettings.is_enabled} onCheckedChange={handleToggle} ariaLabel="Toggle Customer Loyalty Promo" />
              </div>

              <div className={`space-y-4 transition-opacity duration-300 ${!localSettings.is_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-0.5 relative z-20"> 
                  <Label>Free Service Reward</Label>
                  <CustomSelect 
                    options={activeServices} 
                    value={localSettings.free_service_type}
                    onChange={(val) => setLocalSettings({...localSettings, free_service_type: val})}
                  />
                </div>
                <div className="space-y-0.5 relative z-10">
                  <Label htmlFor="orders_required">Orders Needed</Label>
                  <Input 
                    id="orders_required"
                    type="text" 
                    inputMode="numeric" 
                    value={localSettings.orders_required}
                    onChange={(e) => handleInputChange('orders_required', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* PERFORATION */}
            <div className="relative flex items-center justify-center bg-white md:bg-transparent" aria-hidden="true">
                <div className="w-[calc(100%-2rem)] mx-auto h-px md:w-px md:h-[calc(100%-2rem)] border-t-2 md:border-l-2 border-dashed border-slate-300" />
            </div>

            {/* RIGHT SECTION (Visual Ticket) */}
            <div className={`w-full md:w-60 p-4 flex flex-col justify-between rounded-b-xl md:rounded-r-xl transition-colors duration-300 ${localSettings.is_enabled ? 'bg-app-light' : 'bg-slate-50'}`}>
              <div className="space-y-3 text-center">
                <h4 className={`text-nano font-bold uppercase transition-colors ${localSettings.is_enabled ? 'text-teal-600' : 'text-slate-400'}`}>Reward Summary</h4>
                <div className="p-3 bg-white rounded-lg border border-dashed border-sky-300 shadow-sm">
                  <div className="text-h3 font-black text-slate-900">FREE</div>
                  <div className="text-micro font-bold uppercase text-teal-600 truncate" title={localSettings.free_service_type || "No Service"}>
                    {localSettings.free_service_type || "No Service"}
                  </div>
                  <div className="h-px bg-slate-100 my-2" aria-hidden="true" />
                  <p className="text-micro text-slate-500 font-medium">
                    After {localSettings.orders_required || "0"} visits
                  </p>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={!localSettings.is_enabled || !hasChanges || isSaving || !isValid}
                className="mt-3 w-full h-10 flex items-center justify-center rounded-xl text-sm-text font-medium bg-green-700 text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-900 outline-none disabled:opacity-50 transition-all active:scale-95 shadow-md"
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save Ticket"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}