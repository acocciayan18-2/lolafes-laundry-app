import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settings/useSettingsStore';
import SettingsPINLock from "../components/settings/SettingsPINLock";
import { IconLock, IconDatabase} from '../components/icons'; 

// Existing Imports
import PrintTest from "../components/settings/PrintTest";
import SessionSecurity from "../components/settings/SessionSecurity";
import AutoPrintToggle from "../components/settings/AutoPrintToggle";
import ReceiptConfiguration from "../components/settings/ReceiptConfiguration";
import ReceiptButtonToggle from '../components/settings/ReceiptButtonToggle';
import PaymentSettings from "../components/settings/PaymentSettings";
import StoreShiftSettings from "../components/settings/StoreShiftSettings"; 
import ConfirmCompletionToggle from '../components/settings/ConfirmCompletionToggle';

// Cleanup Imports
import CleanupCancelledOrders from '../components/settings/CleanupCancelledOrders';
import CleanupRewardClaims from '../components/settings/CleanupRewardClaims';
import CleanupActivityLogs from '../components/settings/CleanupActivityLogs';

const Settings = () => {
  // ✨ FIX: Grab the individual loading states directly
  const { systemConfig, subscribeToSettings, isLoadingReceipt, isLoadingSystem } = useSettingsStore();
  
  // ✨ FIX: Calculate the combined loading state inside the component for guaranteed reactivity
  const isLoading = isLoadingReceipt || isLoadingSystem;
  
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return localStorage.getItem('settings_unlocked') === 'true';
  });

  useEffect(() => {
    const unsubscribe = subscribeToSettings();
    return () => unsubscribe(); 
  }, [subscribeToSettings]);

  const handleToggleLock = (status) => {
    setIsUnlocked(status);
    localStorage.setItem('settings_unlocked', status);
  };

  if (isLoading) return null; 

  if (!isUnlocked) {
    return <SettingsPINLock 
              onUnlock={() => handleToggleLock(true)} 
              existingPIN={systemConfig?.ownerPIN} 
           />;
  }

  return (
    <div className="min-h-screen bg-app-light p-2">
      <div className="max-w-6xl mx-auto px-1 md:px-2 pb-10">
        
        {/* HEADER SECTION */}
        <div className="flex items-center justify-between w-full mb-6">
          <div>
            <h1 className="text-h2 font-bold text-text-dark">Settings</h1>
            <p className="text-sm-text text-gray-600 mt-0.5">
              Manage your systems configurations
            </p>
          </div>

          <button 
            onClick={() => handleToggleLock(false)}
            className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-micro font-normal text-text-dark hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          >
            <IconLock className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            Lock Settings
          </button>
        </div>

        {/* PRIMARY SETTINGS (Full Width) */}
        <div className="w-full mb-3">
          <StoreShiftSettings />
        </div>

        {/* MASONRY GRID FOR CONFIGURATIONS */}
        <div className="columns-1 md:columns-2 gap-3 space-y-3">
          <div className="break-inside-avoid">
            <ReceiptConfiguration />
          </div>
          
          <div className="break-inside-avoid space-y-3">
            <ConfirmCompletionToggle /> 
            <AutoPrintToggle />
            <ReceiptButtonToggle />
          </div>

          <div className="break-inside-avoid">
            <PrintTest />
          </div>

          <div className="break-inside-avoid">
            <PaymentSettings />
          </div>

          <div className="break-inside-avoid">
            <SessionSecurity />
          </div>
        </div>

        {/* DATABASE MAINTENANCE SECTION */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-4 px-1">
            <IconDatabase className="w-5 h-5 text-text-dark" />
            <div>
              <h3 className="text-base-text font-bold text-text-dark">Database Maintenance</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <CleanupCancelledOrders />
            <CleanupRewardClaims />
            <CleanupActivityLogs />
          </div>
          
          <p className="mt-2 px-2 text-micro text-text-dark/60 italic">
            * Note: These actions are permanent and cannot be undone. Please ensure you have backed up any necessary data before clearing.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Settings;