import { motion } from "framer-motion";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { useActivityStore } from "../../store/activities/useActivityStore";

const ConfirmCompletionToggle = () => {
  const { systemConfig, toggleConfirmCompletion } = useSettingsStore();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const { logActivity } = useActivityStore();
  
  const isEnabled = systemConfig?.confirmCompletion ?? true;

  const handleToggle = async (e) => {
    e.preventDefault();
    
    try {
      const result = await toggleConfirmCompletion();
      
      if (result.success) {
        const newState = !isEnabled;
        const message = newState 
          ? "Completion Safety Enabled" 
          : "Completion Safety Disabled";
          
        showNotification(message, "success");
        logActivity(`Settings: ${message}`);
      } else {
        showNotification("Failed to update preferences", "error");
      }
    } catch (error) {
      console.error("Toggle Error:", error);
      showNotification("An unexpected error occurred", "error");
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-4 text-app-dark">
          <h2 className="font-bold  text-base-text">Completion Safeguard</h2>
        </div>

        <button 
          type="button" 
          onClick={handleToggle}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer z-10 ${
            isEnabled ? 'bg-emerald-500' : 'bg-slate-200'
          }`}
        >
          <motion.div 
            animate={{ x: isEnabled ? 26 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm pointer-events-none"
          />
        </button>
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
        <div className="flex flex-col gap-1">
          <p className="text-micro text-text-dark/70 leading-relaxed">
            When enabled, the system will ask for confirmation and offer an SMS notification option before finishing an order.
          </p>
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className={`text-micro font-medium ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
            {isEnabled ? 'Protection Active' : 'Fast-Track Mode'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCompletionToggle;