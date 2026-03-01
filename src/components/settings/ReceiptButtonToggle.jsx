
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { motion } from 'framer-motion'; // Assuming you use framer-motion for your UI

export default function ReceiptButtonToggle() {
  const { receiptConfig, updateReceiptConfig } = useSettingsStore();

  const handleToggle = async () => {
    // We only send the field we want to change; { merge: true } handles the rest
    await updateReceiptConfig({ 
      showPrintReceipt: !receiptConfig.showPrintReceipt 
    });
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <div>
        <h4 className="text-sm font-bold text-slate-800">Order Card Print Button</h4>
        <p className="text-[11px] text-slate-500">Enable or disable the 'Print Receipt' option on orders.</p>
      </div>

      <button
        onClick={handleToggle}
        className={`w-12 h-6 rounded-full transition-colors relative ${
          receiptConfig.showPrintReceipt ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <motion.div
          animate={{ x: receiptConfig.showPrintReceipt ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}