import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { useActivityStore } from "../../store/activities/useActivityStore";

const AutoPrintToggle = () => {
  // --- GLOBAL STATE (Optimized Selectors) ---
  // We explicitly select ONLY what we need to prevent unnecessary re-renders
  const isAutoPrintEnabled = useSettingsStore((state) => state.systemConfig?.autoPrint ?? false);
  const toggleAutoPrint = useSettingsStore((state) => state.toggleAutoPrint);
  
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity);

  // --- LOCAL STATE ---
  const [isUpdating, setIsUpdating] = useState(false);

  // --- HANDLERS ---
  const handleToggle = useCallback(async (e) => {
    // Defensive programming: prevent form submissions or bubbling
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Lock: Prevent race conditions from rapid double-clicks
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      // Send request to backend via store action
      const success = await toggleAutoPrint(); 
      
      if (success !== false) {
        // Derive the expected next state to ensure accurate logging
        const nextState = !isAutoPrintEnabled; 
        const message = nextState ? "Auto-Print Enabled" : "Auto-Print Paused";
        
        showNotification(message, "success");
        if (typeof logActivity === 'function') {
          logActivity(` ${message}`);
        }
      } else {
        throw new Error("Backend rejected the settings update.");
      }
    } catch (error) {
      console.error("[AutoPrintToggle] Update failed:", error);
      showNotification("Failed to update auto-print. Please check your connection.", "error");
    } finally {
      // Release lock regardless of success or failure
      setIsUpdating(false);
    }
  }, [isUpdating, isAutoPrintEnabled, toggleAutoPrint, showNotification, logActivity]);

  // --- RENDER ---
  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-4 text-app-dark">
          {/* Linked to ARIA description for screen readers */}
          <h2 id="autoprint-label" className="font-bold text-base-text">Auto-Print Receipts</h2>
        </div>

        {/* Accessible Switch Button */}
        <button 
          type="button" 
          role="switch"
          aria-checked={isAutoPrintEnabled}
          aria-labelledby="autoprint-label"
          aria-describedby="autoprint-description"
          onClick={handleToggle}
          disabled={isUpdating}
          className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 cursor-pointer z-10 ${
            isAutoPrintEnabled ? 'bg-emerald-500' : 'bg-slate-200'
          } ${isUpdating ? 'opacity-50 cursor-wait' : 'hover:shadow-md'}`}
        >
          <motion.div 
            animate={{ x: isAutoPrintEnabled ? 26 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm pointer-events-none"
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
        <div className="flex flex-col gap-1">
          <p id="autoprint-description" className="text-micro text-text-dark/70 leading-relaxed">
            When enabled, a receipt will fire to your default printer the moment a new order is saved.
          </p>
        </div>
        
        {/* Visual State Indicator */}
        <div className="mt-2 flex items-center gap-2" aria-live="polite">
          <span 
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              isAutoPrintEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
            }`} 
            aria-hidden="true"
          />
          <span className={`text-micro font-bold transition-colors duration-300 ${
            isAutoPrintEnabled ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            {isUpdating 
              ? "Updating..." 
              : (isAutoPrintEnabled ? 'Auto-print Active' : 'Auto-print Paused')
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default AutoPrintToggle;