import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { useActivityStore } from '../../store/activities/useActivityStore';
import { IconLoading, IconStatusReady, IconClock } from '../icons';
import Button from '../ui/Button';

// --- UTILITIES (Security & Validation) ---
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim(); // Strips malicious HTML tags
};

export default function ReceiptConfiguration() {
  const { receiptConfig, updateReceiptConfig, isLoading } = useSettingsStore();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity);
  
  // Initialize as null to prevent rendering with empty/stale data
  const [formData, setFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // 🔄 Hydration: Safely sync store data to local state
  useEffect(() => {
    if (receiptConfig) {
      setFormData(receiptConfig);
    }
  }, [receiptConfig]);

  // --- MEMOIZED DERIVED STATE ---
  const isDirty = useMemo(() => {
    if (!formData || !receiptConfig) return false;
    return JSON.stringify(formData) !== JSON.stringify(receiptConfig);
  }, [formData, receiptConfig]);

  // --- STABILIZED HANDLERS ---
  const handleUpdateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    if (!isDirty || isSaving) return;

    // 🛡️ SECURITY: Final sanitization before backend transmission
    const sanitizedData = {
      ...formData,
      storeName: sanitizeInput(formData.storeName),
      address: sanitizeInput(formData.address),
      footerMessage: sanitizeInput(formData.footerMessage),
      email: formData.email?.trim().toLowerCase(),
      website: formData.website?.trim(),
    };

    setIsSaving(true);
    try {
      const result = await updateReceiptConfig(sanitizedData);
      
      // QA Guard: Verify actual success from store payload
      if (result !== false && result?.success !== false) {
        showNotification("Receipt Updated", "success");
        logActivity("Updated Receipt Configuration");
      } else {
        throw new Error("Store rejected the update.");
      }
    } catch (error) {
      console.error("[ReceiptConfig Error]:", error);
      showNotification("Sync Failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Resilience: Prevent rendering form inputs if data hasn't arrived
  if (isLoading || !formData) return (
    <div className="h-64 flex flex-col items-center justify-center gap-3" aria-busy="true">
      <IconLoading className="animate-spin text-emerald-500 w-8 h-8" />
    </div>
  );

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500 !rounded-3xl">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-md shadow-slate-200/50 overflow-hidden">
        
        <div className="p-8 pb-4 pl-5 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-app-dark">
            <h2 className="font-bold text-base-text">Receipt Configurations</h2>
          </div>
        </div>

        <div className="p-5 pt-2">
          
          <div className="grid grid-cols-1 gap-5">
            <InputField 
              id="storeName"
              label="Store Name" 
              value={formData.storeName} 
              onChange={handleUpdateField} 
              placeholder="Lola Fe's Laundry"
            />
            <InputField 
              id="address"
              label="Address" 
              value={formData.address} 
              onChange={handleUpdateField} 
              placeholder="Street, City"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <InputField 
                id="phone"
                label="Contact" 
                value={formData.phone} 
                onChange={handleUpdateField} 
                placeholder="0912..."
              />
              <InputField 
                id="email"
                label="Email" 
                type="email"
                value={formData.email} 
                onChange={handleUpdateField} 
                placeholder="shop@mail.com"
              />
            </div>

            <InputField 
              id="website"
              label="Website / Social Media" 
              value={formData.website} 
              onChange={handleUpdateField} 
              placeholder="www.lolafe.com"
            />
          </div>

          <div className="px-5 py-2 flex flex-col">
             <ToggleField 
               id="showOrderDate"
               label="Display Transaction Date" 
               icon={<IconStatusReady className="w-4 h-4" />}
               checked={formData.showOrderDate} 
               onChange={handleUpdateField} 
             />
             <ToggleField 
               id="showPrintDate"
               label="Display Print Timestamp" 
               icon={<IconClock className="w-4 h-4" />}
               checked={formData.showPrintDate} 
               onChange={handleUpdateField} 
             />
          </div>

          <div className="relative group mb-3">
            <label htmlFor="footerMessage" className="text-micro  text-text-dark/70 ml-4 mb-2 block">
              Footer Message
            </label>
            <textarea 
              id="footerMessage"
              value={formData.footerMessage}
              onChange={(e) => handleUpdateField('footerMessage', e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm-text  text-text-dark outline-none focus:bg-white focus:border-emerald-200 transition-all h-14 custom-scrollbar resize-none shadow-inner"
              placeholder="Thank you message..."
            />
          </div>

          <div className="flex justify-end">
            <Button 
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!isDirty || isSaving}
              className="w-[160px] !py-3 !rounded-2xl !font-normal !text-sm-text"
            >
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ATOMIC SUB-COMPONENTS ---

const InputField = memo(({ id, label, value, onChange, placeholder, type = "text" }) => {
  return (
    <div className="relative">
      <label htmlFor={id} className="absolute -top-2 left-5 bg-white px-2 text-micro  text-text-dark/70 z-10">
        {label}
      </label>
      <input 
        id={id}
        type={type}
        value={value || ''}
        onChange={(e) => onChange(id, e.target.value)}
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm-text  text-text-dark focus:ring-1 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-200"
        placeholder={placeholder}
      />
    </div>
  );
});
InputField.displayName = "InputField";

const ToggleField = memo(({ id, label, icon, checked, onChange }) => {
  return (
    <button 
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      className="flex items-center justify-between cursor-pointer select-none group focus:outline-none w-full text-left" 
      onClick={() => onChange(id, !checked)}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl transition-all duration-300 ${checked ? 'text-emerald-600' : 'text-slate-400'}`}>
          {icon}
        </div>
        <span className={`text-micro font-bold tracking-tight transition-colors duration-300 ${checked ? 'text-text-dark' : 'text-slate-400'}`}>
          {label}
        </span>
      </div>
      <div className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-300 ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}>
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-300 shadow-md ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
      </div>
    </button>
  );
});
ToggleField.displayName = "ToggleField";