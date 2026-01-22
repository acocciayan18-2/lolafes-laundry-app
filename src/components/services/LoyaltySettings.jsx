import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useLoyaltyStore } from "../../store/services/useLoyaltyStore";
import { useServiceStore } from "../../store/services/useServiceStore";
import { IconArrowUp, IconGift } from "../icons";

// --- UI Helpers ---
const Label = ({ children }) => (
  <label className="text-micro font-medium text-text-dark/60 block mb-1.5 ml-1 ">
    {children}
  </label>
);

const Input = ({ type, value, onChange, disabled, className, placeholder, inputMode }) => (
  <input 
    type={type} 
    value={value} 
    onChange={onChange} 
    disabled={disabled}
    placeholder={placeholder}
    inputMode={inputMode}
    className={`flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base-text font-medium  focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-sm disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
  />
);

const Switch = ({ checked, onCheckedChange }) => (
  <button 
    type="button" 
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-green-700' : 'bg-slate-300'}`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

// --- UPDATED CUSTOM SELECT: High Stacking Priority ---
const CustomSelect = ({ value, onChange, options, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`  relative w-full ${isOpen ? 'z-[100]' : 'z-auto'}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-xl border bg-white px-3 py-2 text-base-text font-medium focus:outline-none
          ${isOpen ? "border-gray-900  ring-gray-900" : "border-slate-200 hover:border-gray-300"}
          ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "cursor-pointer"}
        `}
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value || "Select Service"}
        </span>
        <IconArrowUp className={`w-4 h-4 text-slate-800 transition-transform duration-200 ${isOpen ? 'rotate-0' : 'rotate-180'}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-[999] overflow-hidden py-2 p-3 animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-60 custom-scrollbar overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.name);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2.5 text-left text-base-text flex items-center justify-between transition-colors hover:bg-gray-50 font-medium text-text-dark"
              >
                {option.name}
                {value === option.name && (
                  <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-3 text-center text-nano font-bold text-slate-400 uppercase ">
                No Active Services Found
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

  useEffect(() => {
    if (!isLoading) setLocalSettings(loyaltySettings);
  }, [loyaltySettings, isLoading]);

  const handleInputChange = (field, rawValue) => {
    let val = rawValue.replace(/\D/g, ""); 
    if (val.length > 0) val = String(Number(val)); 
    setLocalSettings({ ...localSettings, [field]: val });
  };

  const executeStatusChange = async (newStatus) => {
    const updated = { ...localSettings, is_enabled: newStatus };
    setLocalSettings(updated);
    await saveLoyaltySettings(updated);
    logActivity({
        customer_name: "Loyalty Program",
        order_number: "SETTINGS",
        total_amount: 0
    }, newStatus ? 'ready' : 'picked_up', {
        action: 'status_update',
        label: newStatus ? "Loyalty Program Enabled" : "Loyalty Program Disabled"
    });
  };

  const handleToggle = (checked) => {
    if (checked) {
      executeStatusChange(true);
    } else {
      setShowConfirmDialog(true);
    }
  };

  const confirmDisable = () => {
    executeStatusChange(false);
    setShowConfirmDialog(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changes = [];
      if (localSettings.free_service_type !== loyaltySettings.free_service_type) changes.push("Reward Service");
      if (Number(localSettings.orders_required) !== Number(loyaltySettings.orders_required)) changes.push("Visit Threshold");

      const descriptiveLabel = changes.length > 0 ? `${changes.join(" & ")} Updated` : "Loyalty Settings Updated";

      await saveLoyaltySettings({
        ...localSettings,
        orders_required: Number(localSettings.orders_required)
      });

      logActivity({
          customer_name: "Loyalty Program", 
          order_number: "CONFIG",
          total_amount: 0
      }, 'in_progress', {
          action: 'status_update',
          label: descriptiveLabel
      });

    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(loyaltySettings);
  const isValid = localSettings.orders_required > 0 && localSettings.free_service_type !== "";

  if (isLoading) return null;

  return (
    <div className="w-full relative z-10">
      <AnimatePresence mode="wait">
        {showConfirmDialog ? (
          <motion.div
            key="confirm"
            // REMOVED SCALE: Now only fades in/out
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full bg-red-50 border border-red-200 shadow-sm rounded-xl p-6 flex flex-col items-center text-center"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-red-600">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <circle cx="9" cy="10" r="1" fill="currentColor"/>
                <circle cx="15" cy="10" r="1" fill="currentColor"/>
                <path d="M16 16C16 16 14.5 14 12 14C9.5 14 8 16 8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h3 className="text-h3 font-bold text-red-900 mb-1">Disable Loyalty Program?</h3>
            <p className="text-sm-text text-red-700 max-w-sm leading-relaxed mb-6">
              This will <span className="font-bold">reset all customer points to zero</span>. Customers will lose their progress towards free rewards.
            </p>

            <div className="flex w-full max-w-xs gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 h-10 rounded-lg border border-red-200 bg-white text-slate-700 font-bold text-sm-text hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisable}
                className="flex-1 h-10 rounded-lg bg-red-600 text-white font-bold text-sm-text hover:bg-red-700 transition-colors shadow-sm"
              >
                Yes, Disable
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            // REMOVED SCALE: Now only fades in/out
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col md:flex-row bg-white border border-slate-200 shadow-sm rounded-xl"
          >
            {/* LEFT SECTION */}
            <div className="flex-1 p-4 rounded-t-xl md:rounded-l-xl bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`border w-9 h-9 rounded-lg flex items-center justify-center shadow-hollow transition-colors ${localSettings.is_enabled ? 'bg-app-light' : 'bg-slate-100'}`}>
                    <IconGift className={`w-5 h-5 ${localSettings.is_enabled ? 'text-teal-600' : 'text-slate-400'}`} />
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
                <Switch checked={localSettings.is_enabled} onCheckedChange={handleToggle} />
              </div>

              <div className={`space-y-4 ${!localSettings.is_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-0.5 relative z-20"> 
                  <Label>Free Service Reward</Label>
                  <CustomSelect 
                    options={services.filter(s => s.is_active)} 
                    value={localSettings.free_service_type}
                    onChange={(val) => setLocalSettings({...localSettings, free_service_type: val})}
                  />
                </div>
                <div className="space-y-0.5 relative z-10">
                  <Label>Orders Needed</Label>
                  <Input 
                    type="text"
                    inputMode="numeric" 
                    value={localSettings.orders_required}
                    onChange={(e) => handleInputChange('orders_required', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* PERFORATION */}
            <div className="relative flex items-center justify-center bg-white md:bg-transparent">
                <div className="w-[calc(100%-2rem)] mx-auto h-px md:w-px md:h-[calc(100%-2rem)] border-t-2 md:border-l-2 border-dashed border-slate-300" />
            </div>

            {/* RIGHT SECTION (Visual Ticket) */}
            <div className={`w-full md:w-60 p-4 flex flex-col justify-between rounded-b-xl md:rounded-r-xl ${localSettings.is_enabled ? 'bg-app-light' : 'bg-slate-50'}`}>
              <div className="space-y-3 text-center">
                <h4 className="text-nano font-black uppercase  text-teal-600">Reward Summary</h4>
                <div className="p-3 bg-white rounded-lg border border-dashed border-sky-300 shadow-sm">
                  <div className="text-h3 font-black text-slate-900">FREE</div>
                  <div className="text-micro font-bold uppercase text-teal-600 truncate">{localSettings.free_service_type || "No Service"}</div>
                  <div className="h-px bg-slate-100 my-2" />
                  <p className="text-micro text-slate-500 font-medium">After {localSettings.orders_required} visits</p>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || !isValid}
                className="mt-3 w-full h-10 flex items-center justify-center rounded-xl text-sm-text font-medium bg-slate-800 text-white disabled:opacity-50 transition-all active:scale-95 shadow-md "
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