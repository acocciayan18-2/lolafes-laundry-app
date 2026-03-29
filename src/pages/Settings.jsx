/**
 * @file Settings.jsx
 * @description Enterprise Configuration Dashboard for Lola Fe's POS.
 * Implements strict in-memory authentication gating and Atomic Store Selectors.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSettingsStore } from '../store/settings/useSettingsStore';
import SettingsPINLock from "../components/settings/SettingsPINLock";
import { IconLock, IconDatabase } from '../components/icons'; 

// Existing Imports
import PrintTest from "../components/settings/PrintTest";
import SessionSecurity from "../components/settings/SessionSecurity";
import AutoPrintToggle from "../components/settings/AutoPrintToggle";
import ReceiptConfiguration from "../components/settings/ReceiptConfiguration";
import ReceiptButtonToggle from '../components/settings/ReceiptButtonToggle';
import PaymentSettings from "../components/settings/PaymentSettings";
import StoreShiftSettings from "../components/settings/StoreShiftSettings"; 
import ConfirmCompletionToggle from '../components/settings/ConfirmCompletionToggle';

// ✨ NEW: Order Tracking Component
import { OrderTrackingToggle } from '../components/settings/OrderTrackingToggle';

// Cleanup Imports
import CleanupCancelledOrders from '../components/settings/CleanupCancelledOrders';
import CleanupRewardClaims from '../components/settings/CleanupRewardClaims';
import CleanupActivityLogs from '../components/settings/CleanupActivityLogs';

const Settings = () => {
  // ⚡ PERFORMANCE: Atomic Selectors.
  const systemConfig = useSettingsStore(useCallback(state => state.systemConfig, []));
  const subscribeToSettings = useSettingsStore(useCallback(state => state.subscribeToSettings, []));
  const isLoadingReceipt = useSettingsStore(useCallback(state => state.isLoadingReceipt, []));
  const isLoadingSystem = useSettingsStore(useCallback(state => state.isLoadingSystem, []));
  
  const isLoading = useMemo(() => isLoadingReceipt || isLoadingSystem, [isLoadingReceipt, isLoadingSystem]);
  
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSettings();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe(); 
    };
  }, [subscribeToSettings]);

  const handleToggleLock = useCallback((status) => {
    setIsUnlocked(status);
  }, []);

  if (isLoading) return null; 

  if (!isUnlocked) {
    return (
      <SettingsPINLock 
        onUnlock={() => handleToggleLock(true)} 
        existingPIN={systemConfig?.ownerPIN} 
      />
    );
  }

  return (
    <main className="min-h-screen bg-app-light p-2" aria-label="Settings Dashboard">
      <div className="max-w-6xl mx-auto px-1 md:px-2 pb-10">
        
        {/* HEADER SECTION */}
        <header className="flex items-center justify-between w-full mb-6">
          <div>
            <h1 className="text-h2 font-bold text-text-dark">Settings</h1>
            <p className="text-sm-text text-slate-500 mt-0.5 font-normal">
              Manage your systems configurations
            </p>
          </div>

          <button 
            onClick={() => handleToggleLock(false)}
            aria-label="Lock settings dashboard"
            className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-micro  text-text-dark hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 active:scale-95"
          >
            <IconLock className="w-3.5 h-3.5 transition-transform group-hover:scale-110" aria-hidden="true" />
            Lock Settings
          </button>
        </header>

        {/* PRIMARY SETTINGS (Full Width) */}
        <section className="w-full mb-3" aria-label="Store Operations">
          <StoreShiftSettings />
        </section>

        {/* MASONRY GRID FOR CONFIGURATIONS */}
        <section className="columns-1 md:columns-2 gap-3 space-y-3" aria-label="Hardware and Application Settings">
          <div className="break-inside-avoid">
            <ReceiptConfiguration />
          </div>
          
          <div className="break-inside-avoid space-y-3">
            <ConfirmCompletionToggle /> 
            <AutoPrintToggle />
            <ReceiptButtonToggle />
            {/* ✨ ADDED: Order Tracking Toggle */}
            <OrderTrackingToggle />
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
        </section>

        {/* DATABASE MAINTENANCE SECTION */}
        <section className="mt-8 pt-8 border-t border-slate-200" aria-labelledby="maintenance-title">
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-hollow">
              <IconDatabase className="w-5 h-5 text-slate-600" aria-hidden="true" />
            </div>
            <div>
              <h3 id="maintenance-title" className="text-base-text font-bold text-text-dark">
                Database Maintenance
              </h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <CleanupCancelledOrders />
            <CleanupRewardClaims />
            <CleanupActivityLogs />
          </div>
          
          <p className="mt-3 px-2 text-micro  text-rose-500/80 italic leading-relaxed">
            * Note: These actions are permanent and cannot be undone. Please ensure you have exported and backed up any necessary data before clearing your ledgers.
          </p>
        </section>

      </div>
    </main>
  );
};

export default Settings;