import React, { useState } from "react";
import { motion } from "framer-motion";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore"; // ✨ Added Notification Store

export const OrderTrackingToggle = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Connect to global settings store
  const systemConfig = useSettingsStore((state) => state.systemConfig);
  const updateSystemConfig = useSettingsStore((state) => state.updateSystemConfig);
  
  // ✨ Connect to notification store
  const showNotification = useNotificationStore((state) => state.showNotification);

  // Fallback to true if the config hasn't loaded yet
  // Using 'enableOrderTracking' to match your updated SettingsStore camelCase
  const isEnabled = systemConfig?.enableOrderTracking ?? true;
  const statusLabel = isEnabled ? "Tracking Enabled" : "Tracking Disabled";

  const handleToggle = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    const newToggleState = !isEnabled;

    // Send the update to Firestore
    const result = await updateSystemConfig({
      enableOrderTracking: newToggleState
    });

    // ✨ Trigger UI Feedback
    if (result.success) {
      showNotification(
        `Order tracking is now ${newToggleState ? 'Enabled' : 'Disabled'}`, 
        "success"
      );
    } else {
      showNotification(
        result.error || "Failed to update tracking settings", 
        "error"
      );
    }

    setIsUpdating(false);
  };

  return (
    <section 
      className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:border-gray-200"
      aria-labelledby="order-tracking-title"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-4 text-app-dark">
          <h2 id="order-tracking-title" className="font-bold text-base-text">
            Public Order Tracking
          </h2>
        </div>

        {/* ♿ A11Y COMPLIANT SWITCH */}
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          aria-labelledby="order-tracking-title"
          aria-describedby="order-tracking-desc"
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
          <p id="order-tracking-desc" className="text-micro text-text-dark/70 leading-relaxed">
            Allow customers to track their laundry progress online securely. If enabled, a tracking QR code will be generated on their thermal receipt.
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
            {isUpdating ? "Updating Database..." : statusLabel}
          </span>
        </div>
      </div>
    </section>
  );
};