import { motion } from "framer-motion";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { useActivityStore } from "../../store/activities/useActivityStore";

const AutoPrintToggle = () => {
  const { systemConfig, toggleAutoPrint } = useSettingsStore();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const { logActivity } = useActivityStore();
  
  const isAutoPrintEnabled = systemConfig?.autoPrint || false;

  const handleToggle = async (e) => {
    e.preventDefault();
    
    const result = await toggleAutoPrint(); 
    
    if (result !== false) {
      const message = !isAutoPrintEnabled ? "Auto-Print Enabled" : "Auto-Print Paused";
      showNotification(message, "success");
      if (logActivity) {
        logActivity(`Settings: ${message}`);
      }
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between ">
        <div className="flex items-center gap-2 mb-4 text-app-dark">
          <h2 className="font-bold text-h3">Auto-Print Receipts</h2>
        </div>

        <button 
          type="button" 
          onClick={handleToggle}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer z-10 ${
            isAutoPrintEnabled ? 'bg-emerald-500' : 'bg-slate-200'
          }`}
        >
          <motion.div 
            animate={{ x: isAutoPrintEnabled ? 26 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm pointer-events-none"
          />
        </button>
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
        <div className="flex flex-col gap-1">
          <p className="text-micro text-text-dark/70 leading-relaxed">
            When enabled, a receipt will fire to your default printer the moment a new order is saved.
          </p>
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isAutoPrintEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className={`text-micro font-medium ${isAutoPrintEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
            {isAutoPrintEnabled ? 'Auto-print Active' : 'Auto-print Paused'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AutoPrintToggle;