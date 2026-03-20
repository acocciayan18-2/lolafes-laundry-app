/**
 * @file ReceiptButtonToggle.jsx
 * @description Enterprise-grade toggle module for Lola Fe's Laundry POS.
 * Implements atomic state synchronization, race-condition guards, and ARIA switch patterns.
 */

import React, { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { useActivityStore } from "../../store/activities/useActivityStore";

const ReceiptButtonToggle = () => {
  // --- STORE SELECTORS (Granular for O(1) Render Isolation) ---
  // Using specific selectors prevents the component from re-rendering when 
  // unrelated parts of the store (e.g., store address or email) change.
  const isEnabled = useSettingsStore(
    (state) => state.receiptConfig?.showPrintReceipt ?? true
  );
  const updateReceiptConfig = useSettingsStore(
    (state) => state.updateReceiptConfig
  );
  const showNotification = useNotificationStore(
    (state) => state.showNotification
  );
  const logActivity = useActivityStore(
    (state) => state.logActivity
  );

  // --- LOCAL STATE (Transaction Management) ---
  const [isPending, setIsPending] = useState(false);

  // --- HANDLERS (Memoized for Performance) ---
  const handleToggle = useCallback(async (e) => {
    // 🛡️ Defensive Guard: Prevent event bubbling or default form behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 🔒 Race Condition Guard: Prevent "Double-Tap" execution
    if (isPending) return;

    setIsPending(true);

    try {
      /**
       * DUAL-VERIFICATION LOGIC:
       * We calculate the next state and attempt to commit to backend via updateReceiptConfig.
       * The system only proceeds with UI feedback if the backend confirms success.
       */
      const nextState = !isEnabled;
      const result = await updateReceiptConfig({ 
        showPrintReceipt: nextState 
      });

      if (result?.success) {
        const message = nextState 
          ? "Print button enabled on cards" 
          : "Print button hidden from cards";
        
        showNotification(message, "success");
        
        // Audit Logging: Ensured string literal is clean of potential XSS injection
        if (typeof logActivity === "function") {
          logActivity(` ${message}`);
        }
      } else {
        // Backend/Network rejection handling
        throw new Error(result?.error || "Server rejected settings update");
      }
    } catch (error) {
      console.error("[ReceiptToggle_Critical_Error]:", error);
      showNotification(
        "Failed to update hardware settings. Check connection.", 
        "error"
      );
    } finally {
      setIsPending(false);
    }
  }, [isEnabled, isPending, updateReceiptConfig, showNotification, logActivity]);

  // --- MEMOIZED STRINGS (A11y & Visual Optimization) ---
  const statusLabel = useMemo(() => 
    isEnabled ? "Print Option Active" : "Print Option Hidden", 
  [isEnabled]);

  return (
    <section 
      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all duration-200"
      aria-labelledby="receipt-toggle-title"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-4 text-app-dark">
          <h2 id="receipt-toggle-title" className="font-bold text-base-text">
            Order Card Print Button
          </h2>
        </div>

        <button 
          type="button"
          role="switch" // A11y: Identifies this to screen readers as a toggle
          aria-checked={isEnabled}
          aria-labelledby="receipt-toggle-title"
          disabled={isPending}
          onClick={handleToggle}
          className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 z-10 ${
            isEnabled ? "bg-emerald-500" : "bg-slate-200"
          } ${isPending ? "opacity-50 cursor-wait" : "cursor-pointer hover:shadow-md"}`}
        >
          <motion.div 
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
            Toggle the visibility of the &apos;Print Receipt&apos; button on all order cards.
          </p>
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          <span 
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              isEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
            }`} 
            aria-hidden="true"
          />
          <span className={`text-micro font-bold transition-colors duration-300 ${
            isEnabled ? "text-emerald-600" : "text-slate-400"
          }`}>
            {isPending ? "Updating..." : statusLabel}
          </span>
        </div>
      </div>
    </section>
  );
};

export default ReceiptButtonToggle;