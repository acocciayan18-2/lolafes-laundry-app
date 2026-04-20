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
import { OrderTrackingToggle } from '../components/settings/OrderTrackingToggle';

// ✨ NEW FINANCIAL IMPORTS
import AddExpenseModal from '../components/expenses/AddExpenseModal';
import ProfitHealthWidget from '../components/expenses/ProfitHealthWidget';

// Cleanup Imports
import CleanupCancelledOrders from '../components/settings/CleanupCancelledOrders';
import CleanupRewardClaims from '../components/settings/CleanupRewardClaims';
import CleanupActivityLogs from '../components/settings/CleanupActivityLogs';

const Settings = () => {
  const systemConfig = useSettingsStore(useCallback(state => state.systemConfig, []));
  const subscribeToSettings = useSettingsStore(useCallback(state => state.subscribeToSettings, []));
  const isLoadingReceipt = useSettingsStore(useCallback(state => state.isLoadingReceipt, []));
  const isLoadingSystem = useSettingsStore(useCallback(state => state.isLoadingSystem, []));
  
  const isLoading = useMemo(() => isLoadingReceipt || isLoadingSystem, [isLoadingReceipt, isLoadingSystem]);
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  // ✨ STATE FOR EXPENSE MODAL
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

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
    <p className="text-sm-text text-text-dark/80 mt-0.5 font-normal">
      Manage your systems configurations and financials
    </p>
  </div>

  <div className="flex items-center gap-3">
   <a 
  href="/Lola_Fe_Laundry_Manual.pdf" 
  download="Lola_Fe_Laundry_Manual.pdf"
  className="group flex items-center gap-2 px-4 py-2 bg-app-dark text-white rounded-xl text-micro hover:bg-app-dark/90 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-app-dark/50 active:scale-95"
  aria-label="Download User Manual PDF"
>
  <svg 
    className="w-3.5 h-3.5 transition-transform group-hover:scale-110 stroke-[2.5]" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
  User Manual
</a>

    <button 
      onClick={() => handleToggleLock(false)}
      aria-label="Lock settings dashboard"
      className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-micro text-text-dark hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 active:scale-95"
    >
      <IconLock className="w-3.5 h-3.5 transition-transform group-hover:scale-110" aria-hidden="true" />
      Lock Settings
    </button>
  </div>
</header>

        {/* ✨ FINANCIAL HEALTH SECTION (Top Priority) */}
        <section className="w-full mb-3" aria-label="Financial Health">
          <ProfitHealthWidget onLogExpense={() => setIsExpenseModalOpen(true)} />
        </section>

        {/* PRIMARY SETTINGS */}
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
              <IconDatabase className="w-5 h-5 text-text-dark" aria-hidden="true" />
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
          
          <p className="mt-3 px-2 text-micro text-rose-500/80 italic leading-relaxed">
            * Note: These actions are permanent and cannot be undone. Please ensure you have exported and backed up any necessary data before clearing your ledgers.
          </p>
        </section>

      </div>

      {/* ✨ RENDER THE EXPENSE MODAL */}
      <AddExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
      />
    </main>
  );
};

export default Settings;