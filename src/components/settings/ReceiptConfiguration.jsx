import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { IconLoading, IconStatusReady, IconClock } from '../icons';

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
      showNotification("Receipt Updated", "success");
    } else {
      showNotification("Sync Failed", "error");
    }
    setIsSaving(false);
  };

  if (isLoading) return (
    <div className="h-64 flex flex-col items-center justify-center gap-3">
      <IconLoading className="animate-spin text-emerald-500 w-8 h-8" />
    </div>
  );

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500 !rounded-3xl">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-md shadow-slate-200/50 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-8 pb-4 pl-5 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-app-dark">
            <h2 className="font-bold text-h3">Receipt Configurations</h2>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="p-5 pt-2">
          
          <div className="grid grid-cols-1 gap-5">
            <InputField 
              label="Store Name" 
              value={formData.storeName} 
              onChange={(val) => setFormData({...formData, storeName: val})} 
              placeholder="Lola Fe's Laundry"
            />
            <InputField 
              label="Address" 
              value={formData.address} 
              onChange={(val) => setFormData({...formData, address: val})} 
              placeholder="Street, City"
            />
            
            {/* 2-Column Row for Contact and Email */}
            <div className="grid grid-cols-2 gap-3">
              <InputField 
                label="Contact" 
                value={formData.phone} 
                onChange={(val) => setFormData({...formData, phone: val})} 
                placeholder="0912..."
              />
              <InputField 
                label="Email" 
                value={formData.email} 
                onChange={(val) => setFormData({...formData, email: val})} 
                placeholder="shop@mail.com"
              />
            </div>

            {/* ✨ ADDED: Website / Social Media field */}
            <InputField 
              label="Website / Social Media" 
              value={formData.website} 
              onChange={(val) => setFormData({...formData, website: val})} 
              placeholder="www.lolafe.com"
            />
          </div>

          {/* TOGGLES */}
          <div className="px-5 py-2 flex flex-col">
             <ToggleField 
                label="Display Transaction Date" 
                icon={<IconStatusReady className="w-4 h-4" />}
                checked={formData.showOrderDate} 
                onChange={(val) => setFormData({...formData, showOrderDate: val})} 
              />
              <ToggleField 
                label="Display Print Timestamp" 
                icon={<IconClock className="w-4 h-4" />}
                checked={formData.showPrintDate} 
                onChange={(val) => setFormData({...formData, showPrintDate: val})} 
              />
          </div>

          {/* FOOTER MESSAGE */}
          <div className="relative group mb-3">
            <label className="text-micro font-medium text-text-dark/70 ml-4 mb-2 block">Footer Message</label>
            <textarea 
              value={formData.footerMessage}
              onChange={(e) => setFormData({...formData, footerMessage: e.target.value})}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm-text font-medium text-text-dark outline-none focus:bg-white focus:border-emerald-200 transition-all h-14 custom-scrollbar resize-none shadow-inner"
              placeholder="Thank you message..."
            />
          </div>

            <div className="flex justify-end ">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-[160px] py-3 bg-app-dark hover:bg-app-dark/90 text-white rounded-2xl font-normal text-sm-text active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <IconLoading className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Configuration"
                )}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}


function InputField({ label, value, onChange, placeholder }) {
  return (
    <div className="relative">
      <label className="absolute -top-2 left-5 bg-white px-2 text-micro font-medium text-text-dark/70 z-10">
        {label}
      </label>
      <input 
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm-text font-medium text-text-dark focus:ring-1 focus:ring-emerald-100 outline-none transition-all placeholder:text-slate-200"
        placeholder={placeholder}
      />
    </div>
  );
}

function ToggleField({ label, icon, checked, onChange }) {
  return (
    <div 
      className="flex items-center justify-between cursor-pointer select-none group" 
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl transition-all duration-300 ${checked ? 'text-emerald-600' : 'text-slate-400'}`}>
          {icon}
        </div>
        <span className={`text-[11px] font-bold tracking-tight transition-colors duration-300 ${checked ? 'text-text-dark' : 'text-slate-400'}`}>
          {label}
        </span>
      </div>
      <div className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-300 ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}>
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-300 shadow-md ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
      </div>
    </div>
  );
}