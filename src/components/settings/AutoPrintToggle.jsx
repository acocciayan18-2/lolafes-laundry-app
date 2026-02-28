import { motion } from "framer-motion";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { IconStatusReady } from "../icons";

const AutoPrintToggle = () => {
  const { settings, toggleAutoPrint } = useOrderStore();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-app-dark">
          <IconStatusReady className="w-5 h-5 text-emerald-500" />
          <h2 className="font-bold text-lg">Automation</h2>
        </div>

        {/* THE MASTER TOGGLE SWITCH */}
        <button 
          onClick={toggleAutoPrint}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
            settings?.autoPrint ? 'bg-emerald-500' : 'bg-slate-200'
          }`}
        >
          <motion.div 
            animate={{ x: settings?.autoPrint ? 26 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
          />
        </button>
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl">
        <div className="flex flex-col gap-1">
          <p className="text-sm-text font-bold text-text-dark">Auto-Print Receipts</p>
          <p className="text-nano text-text-dark/50 leading-relaxed">
            When enabled, a receipt will fire to your default printer the moment a new order is saved.
          </p>
        </div>
        
        <div className="mt-4 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${settings?.autoPrint ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className={`text-[10px] font-black uppercase ${settings?.autoPrint ? 'text-emerald-600' : 'text-slate-400'}`}>
            {settings?.autoPrint ? 'System Active' : 'System Paused'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default AutoPrintToggle;