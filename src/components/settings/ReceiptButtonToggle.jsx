import { motion } from "framer-motion";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { useActivityStore } from "../../store/activities/useActivityStore";

export default function ReceiptButtonToggle() {
  const { receiptConfig, updateReceiptConfig } = useSettingsStore();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const { logActivity } = useActivityStore();
  
  const isEnabled = receiptConfig?.showPrintReceipt ?? true;

  const handleToggle = async () => {
    const result = await updateReceiptConfig({ 
      showPrintReceipt: !isEnabled 
    });

    if (result?.success) {
      const message = !isEnabled 
        ? "Print button is now visible" 
        : "Print button hidden from cards";
      
      showNotification(message, "success");
      logActivity(`Settings: ${message}`);
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-4 text-app-dark">
          <h2 className="font-bold text-h3">Order Card Print Button</h2>
        </div>

        <button 
          type="button" 
          onClick={(e) => {
            e.preventDefault();
            handleToggle(); 
          }}
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
            Toggle the visibility of the 'Print Receipt' button on all order cards.
          </p>
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className={`text-micro font-medium ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
            {isEnabled ? 'Print Option Active' : 'Print Option Hidden'}
          </span>
        </div>
      </div>
    </div>
  );
}