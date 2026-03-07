import { motion } from "framer-motion";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore"; // ✨ Added

const SessionSecurity = () => {
  // 1. Pull from systemConfig and the toggle action
  const { systemConfig, toggleAutoLogout } = useSettingsStore();
  const showNotification = useNotificationStore((state) => state.showNotification); // ✨ Hook usage
  
  // 2. Derive state
  const isEnabled = systemConfig?.autoLogout || false;

  const handleToggle = async (e) => {
    e.preventDefault();
    
    // 3. Update Firebase
    const result = await toggleAutoLogout(); 
    
    // 4. ✨ Trigger success notification based on the new state
    if (result !== false) {
      const message = !isEnabled 
        ? "Auto-Logout protection enabled" 
        : "Auto-Logout protection disabled";
      
      showNotification(message, "success");
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-4 text-app-dark">
          <h2 className="font-bold text-h3">Session Security</h2>
        </div>

        {/* THE MASTER TOGGLE SWITCH - Using your Receipt Toggle design */}
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

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-3">
        <div className="flex flex-col gap-1">
          <p className="text-micro text-text-dark/70 leading-relaxed">
            Automatically log out after 30 minutes of tab inactivity to prevent unauthorized access on shared shop computers.
          </p>
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          {/* Status Indicator */}
          <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className={`text-micro font-medium ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
            {isEnabled ? 'Protection Active' : 'Protection Disabled'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SessionSecurity;