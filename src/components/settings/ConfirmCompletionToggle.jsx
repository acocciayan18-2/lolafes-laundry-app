/**
 * @file ConfirmCompletionToggle.jsx
 * @description Enterprise-grade safeguard toggle.
 * Implements atomic store selection, race-condition locking, and strict A11y standards.
 */

import React, { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { useActivityStore } from "../../store/activities/useActivityStore";

const ConfirmCompletionToggle = () => {
  // --- ATOMIC STORE SELECTORS (O(1) Render Isolation) ---
  const isEnabled = useSettingsStore((state) => state.systemConfig?.confirmCompletion ?? true);
  const toggleConfirmCompletion = useSettingsStore((state) => state.toggleConfirmCompletion);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity);

  // --- LOCAL UI TRANSACTION STATE ---
  const [isPending, setIsPending] = useState(false);

  // --- STABILIZED HANDLER ---
  const handleToggle = useCallback(async (e) => {
    e?.preventDefault();
    
    // 🛡️ RACE CONDITION GUARD: Prevent double-clicks hitting the database
    if (isPending) return;

    setIsPending(true);
    try {
      // We await the store's validation and Firestore commit
      const result = await toggleConfirmCompletion();
      
      if (result?.success) {
        // Derive message based on the NEW state confirmed by backend
        const newState = !isEnabled;
        const message = newState 
          ? "Completion Safety Enabled" 
          : "Completion Safety Disabled";
          
        showNotification(message, "success");
        
        if (typeof logActivity === 'function') {
          logActivity(` ${message}`);
        }
      } else {
        throw new Error(result?.error || "Backend rejected preference update");
      }
    } catch (error) {
      console.error("[ConfirmToggle_Error]:", error);
      showNotification(error.message || "An unexpected error occurred", "error");
    } finally {
      setIsPending(false);
    }
  }, [isEnabled, isPending, toggleConfirmCompletion, showNotification, logActivity]);

  // --- MEMOIZED DERIVED DATA ---
  const statusLabel = useMemo(() => 
    isEnabled ? 'Protection Active' : 'Fast-Track Mode', 
  [isEnabled]);

  return (
    <section 
      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:border-gray-200"
      aria-labelledby="completion-safeguard-title"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-4 text-app-dark">
          <h2 id="completion-safeguard-title" className="font-bold text-base-text">
            Completion Safeguard
          </h2>
        </div>

        {/* ♿ A11Y COMPLIANT SWITCH */}
        <button 
          type="button" 
          role="switch"
          aria-checked={isEnabled}
          aria-labelledby="completion-safeguard-title"
          disabled={isPending}
          onClick={handleToggle}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 z-10 ${
            isEnabled ? 'bg-emerald-500' : 'bg-slate-200'
          } ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
        >
          <motion.div 
            initial={false}
            animate={{ x: isEnabled ? 26 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm pointer-events-none"
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50" aria-live="polite">
        <div className="flex flex-col gap-1">
          <p className="text-micro text-text-dark/70 leading-relaxed">
            When enabled, the system will ask for confirmation and offer an SMS notification option before finishing an order.
          </p>
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          <span 
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
            }`} 
            aria-hidden="true"
          />
          <span className={`text-micro font-bold transition-colors duration-300 ${
            isEnabled ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            {isPending ? 'Updating...' : statusLabel}
          </span>
        </div>
      </div>
    </section>
  );
};

export default ConfirmCompletionToggle;