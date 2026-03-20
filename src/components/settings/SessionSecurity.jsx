/**
 * @file SessionSecurity.jsx
 * @description Enterprise-grade security toggle for automated session termination.
 * Implements atomic store selection, race-condition guards, and A11y switch patterns.
 */

import React, { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { useActivityStore } from "../../store/activities/useActivityStore";

const SessionSecurity = () => {
  // --- STORE SELECTORS (Optimized for O(1) Re-renders) ---
  const isEnabled = useSettingsStore(useCallback((state) => state.systemConfig?.autoLogout ?? false, []));
  const toggleAutoLogout = useSettingsStore(useCallback((state) => state.toggleAutoLogout, []));
  const showNotification = useNotificationStore(useCallback((state) => state.showNotification, []));
  const logActivity = useActivityStore(useCallback((state) => state.logActivity, []));

  // --- LOCAL UI STATE ---
  const [isUpdating, setIsUpdating] = useState(false);

  // --- BUSINESS LOGIC (Memoized for Performance) ---
  const handleToggle = useCallback(async (e) => {
    e?.preventDefault();

    // 🛡️ RACE CONDITION GUARD: Prevent concurrent update requests
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      const result = await toggleAutoLogout();

      if (result !== false) {
        const newState = !isEnabled;
        
        // ✨ QA FIX: Instant Manual Cleanup
        // If they turned security OFF, instantly kill the tracking keys
        // so a rapid page-refresh doesn't accidentally log them out.
        if (!newState) {
          localStorage.removeItem('_lf_last_pulse');
          localStorage.removeItem('_lf_tab_death_clock'); // Clean up the old legacy key just in case
        }

        const message = newState
          ? "Auto-Logout protection enabled"
          : "Auto-Logout protection disabled";

        showNotification(message, "success");
        
        // 🛡️ AUDIT LOGGING: Sanitize output for activity logs
        if (typeof logActivity === 'function') {
          logActivity(` ${message.replace(/[<>]/g, "")}`);
        }
      } else {
        throw new Error("Backend validation failed.");
      }
    } catch (error) {
      console.error("[SessionSecurity] Sync Error:", error);
      showNotification("Failed to sync security settings. Check connection.", "error");
    } finally {
      setIsUpdating(false);
    }
  }, [isEnabled, isUpdating, toggleAutoLogout, showNotification, logActivity]);

  // --- DERIVED UI VALUES (Memoized) ---
  const statusLabel = useMemo(() => 
    isEnabled ? 'Protection Active' : 'Protection Disabled', 
  [isEnabled]);

  return (
    <section 
      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:border-gray-200"
      aria-labelledby="session-security-title"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-4 text-app-dark">
          <h2 id="session-security-title" className="font-bold text-base-text">
            Session Security
          </h2>
        </div>

        {/* ♿ A11Y COMPLIANT SWITCH */}
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          aria-labelledby="session-security-title"
          aria-describedby="session-security-desc"
          disabled={isUpdating}
          onClick={handleToggle}
          className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 z-10 ${
            isEnabled ? "bg-emerald-500" : "bg-slate-200"
          } ${isUpdating ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
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

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-3">
        <div className="flex flex-col gap-1">
          <p id="session-security-desc" className="text-micro text-text-dark/70 leading-relaxed">
            Automatically terminate the session if the browser tab is closed for over 30 seconds (TEST MODE). Prevents unauthorized access on shared devices.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2" aria-live="polite">
          <span
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              isEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
            }`}
            aria-hidden="true"
          />
          <span
            className={`text-micro font-bold transition-colors duration-300 ${
              isEnabled ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            {isUpdating ? "Updating..." : statusLabel}
          </span>
        </div>
      </div>
    </section>
  );
};

export default SessionSecurity;