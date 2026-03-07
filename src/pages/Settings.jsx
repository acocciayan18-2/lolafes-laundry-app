import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settings/useSettingsStore';
import SettingsPINLock from "../components/settings/SettingsPINLock";
import { IconLock } from '../components/icons';

// Existing Imports...
import PrintTest from "../components/settings/PrintTest";
import SessionSecurity from "../components/settings/SessionSecurity";
import AutoPrintToggle from "../components/settings/AutoPrintToggle";
import ReceiptConfiguration from "../components/settings/ReceiptConfiguration";
import ReceiptButtonToggle from '../components/settings/ReceiptButtonToggle';
import PaymentSettings from "../components/settings/PaymentSettings";
import StoreShiftSettings from "../components/settings/StoreShiftSettings"; 

const Settings = () => {
  const { systemConfig, subscribeToSettings, isLoading } = useSettingsStore();
  
  // 🔄 Initialize state from localStorage so it persists across navigation/refresh
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return localStorage.getItem('settings_unlocked') === 'true';
  });

  useEffect(() => {
    const unsubscribe = subscribeToSettings();
    return () => unsubscribe(); 
  }, [subscribeToSettings]);

  // ✨ Persist the choice to localStorage
  const handleToggleLock = (status) => {
    setIsUnlocked(status);
    localStorage.setItem('settings_unlocked', status);
  };

  if (isLoading) return null; 

  // 🛡️ Only show lock screen if not unlocked in localStorage
  if (!isUnlocked) {
    return <SettingsPINLock 
              onUnlock={() => handleToggleLock(true)} 
              existingPIN={systemConfig?.ownerPIN} 
           />;
  }

  return (
    <div className="min-h-screen bg-app-light p-2">
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        
        <div className="flex items-center justify-between w-full px-2 mb-3">
          {/* START: Title and Subtitle */}
          <div>
            <h1 className="text-h2 font-bold text-text-dark">Settings</h1>
            <p className="text-sm-text text-gray-600 mt-0.5">
              Manage your systems configurations
            </p>
          </div>

          {/* END: Lock Button */}
          <button 
            onClick={() => handleToggleLock(false)}
            className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-micro font-normal text-text-dark hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
          >
            <IconLock className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            Lock Settings
          </button>
        </div>

        {/* ... (Keep existing Grid/Masonry Layout) */}
        <div className="w-full mb-3">
          <StoreShiftSettings />
        </div>

        <div className="columns-1 md:columns-2 gap-3 space-y-3">
          <div className="break-inside-avoid mb-3">
            <ReceiptConfiguration />
          </div>
          <div className="break-inside-avoid space-y-4 mb-3">
            <AutoPrintToggle />
            <ReceiptButtonToggle />
          </div>
          <div className="break-inside-avoid mb-3">
            <PrintTest />
          </div>
          <div className="break-inside-avoid mb-3">
            <PaymentSettings />
          </div>
          <div className="break-inside-avoid mb-3">
            <SessionSecurity />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;