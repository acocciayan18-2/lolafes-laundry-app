import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { IconReceipt, IconLoading } from '../icons';

export default function ReceiptConfiguration() {
  const { receiptConfig, updateReceiptConfig, isLoading } = useSettingsStore();
  const { showNotification } = useNotificationStore();
  
  const [formData, setFormData] = useState(receiptConfig);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(receiptConfig);
  }, [receiptConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateReceiptConfig(formData);
    if (result.success) {
      showNotification("Receipt branding updated!", "success");
    } else {
      showNotification("Failed to save settings.", "error");
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-10 flex justify-center"><IconLoading className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-app-dark rounded-xl flex items-center justify-center text-white shadow-lg">
          <IconReceipt className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-h3 font-black text-text-dark leading-none">Receipt Branding</h2>
          <p className="text-nano font-bold text-text-dark/40 uppercase tracking-widest mt-1">Configure your POS output</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* --- FORM SECTION --- */}
        <div className="space-y-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-fit">
          <div className="grid grid-cols-1 gap-4">
            <InputField label="Store Name" value={formData.storeName} onChange={(val) => setFormData({...formData, storeName: val})} placeholder="Lola Fe's Laundry" />
            <InputField label="Shop Address" value={formData.address} onChange={(val) => setFormData({...formData, address: val})} placeholder="123 Street, Taguig City" />
            
            <div className="grid grid-cols-2 gap-4">
               <InputField label="Phone / Mobile" value={formData.phone} onChange={(val) => setFormData({...formData, phone: val})} placeholder="0912 345 6789" />
               <InputField label="Email Address" value={formData.email} onChange={(val) => setFormData({...formData, email: val})} placeholder="hello@lolafe.com" />
            </div>

            {/* FIXED: Added missing Website Input */}
            <InputField label="Website / Social Media" value={formData.website} onChange={(val) => setFormData({...formData, website: val})} placeholder="www.lolafe.com" />

            {/* TOGGLES FOR TIMESTAMPS */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
               <ToggleField 
                  label="Show Order Date" 
                  checked={formData.showOrderDate} 
                  onChange={(val) => setFormData({...formData, showOrderDate: val})} 
               />
               <ToggleField 
                  label="Show Print Date" 
                  checked={formData.showPrintDate} 
                  onChange={(val) => setFormData({...formData, showPrintDate: val})} 
               />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-micro font-black text-text-dark/40 uppercase">Footer Dedication</label>
              <textarea 
                value={formData.footerMessage}
                onChange={(e) => setFormData({...formData, footerMessage: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-app-dark outline-none transition-all h-20 resize-none"
                placeholder="Thank you for trusting us!"
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-app-dark text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <IconLoading className="w-4 h-4 animate-spin" /> : "Save Configuration"}
          </button>
        </div>

        {/* --- LIVE PREVIEW SECTION --- */}
        <div className="hidden md:block">
           <h4 className="text-micro font-black text-text-dark/40 uppercase mb-3 px-2">Live Preview</h4>
           <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200 flex justify-center">
              <div className="w-[280px] bg-white shadow-2xl p-6 font-mono text-[10px] text-slate-800 pointer-events-none border-t-[10px] border-app-dark">
                <div className="text-center space-y-1 mb-4">
                  <div className="text-sm font-black uppercase">{formData.storeName || "STORE NAME"}</div>
                  {/* FIXED: Dynamic fields for Preview */}
                  {formData.address && <div className="leading-tight opacity-70">{formData.address}</div>}
                  {formData.phone && <div className="opacity-70">Tel: {formData.phone}</div>}
                  {formData.email && <div className="opacity-70">{formData.email}</div>}
                  {formData.website && <div className="opacity-70">{formData.website}</div>}
                </div>

                <div className="border-b border-dashed border-slate-300 my-2" />
                
                <div className="text-center py-1">
                  <div className="text-base font-black uppercase">JUAN DELA CRUZ</div>
                  <div className="font-bold text-[12px]">#ORD-2024-001</div>
                </div>

                <div className="border-b border-dashed border-slate-300 my-2" />

                <div className="space-y-0.5 mb-3 opacity-80">
                  {formData.showOrderDate && (
                    <div className="flex justify-between">
                      <span>ORDERED:</span>
                      <span>Oct 24, 2024 09:30 AM</span>
                    </div>
                  )}
                  {formData.showPrintDate && (
                    <div className="flex justify-between">
                      <span>PRINTED:</span>
                      <span>{new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between"><span>Wash & Dry (Full)</span><span>P180.00</span></div>
                  <div className="flex justify-between"><span>Delivery Fee</span><span>P50.00</span></div>
                </div>

                <div className="border-b border-dashed border-slate-300 my-3" />
                <div className="text-right text-sm font-black">TOTAL: P230.00</div>

                <div className="text-center mt-8 space-y-2">
                  <p className="italic font-bold">{formData.footerMessage || "Thank you!"}</p>
                  <div className="text-[8px] opacity-40 uppercase tracking-widest">--- End of Receipt ---</div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

// ... InputField and ToggleField sub-components stay the same
function InputField({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-micro font-black text-text-dark/40 uppercase">{label}</label>
      <input 
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-text-dark focus:border-app-dark outline-none transition-all"
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-[10px] font-black text-text-dark/60 uppercase">{label}</span>
      <div 
        onClick={() => onChange(!checked)}
        className={`w-8 h-4 rounded-full relative transition-all ${checked ? 'bg-app-dark' : 'bg-slate-300'}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${checked ? 'left-4.5' : 'left-0.5'}`} />
      </div>
    </label>
  );
}