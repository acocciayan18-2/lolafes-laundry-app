// src/components/orders/CompleteOrderModal.jsx
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { IconStatusCompleted, IconClose } from "../icons";

export default function CompleteOrderModal({ isOpen, onClose, onConfirm, orderNumber, customerName }) {
  const [sendSms, setSendSms] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm(sendSms);
    setIsProcessing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm"
          onClick={() => !isProcessing && onClose()}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 relative"
          >
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"
            >
              <IconClose className="w-5 h-5" />
            </button>

            <div className="text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                <IconStatusCompleted className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-text-dark tracking-tight">Mark as Completed?</h3>
              <p className="text-sm-text font-medium text-text-dark/70 mt-1">
                Order #{orderNumber} for {customerName}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl mb-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    disabled={isProcessing}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 bg-white border-2 border-slate-300 rounded transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/30"></div>
                  <svg className="absolute w-5 h-5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm-text font-medium text-text-dark group-hover:text-text-dark transition-colors flex items-center gap-1.5">
                    
                    Notify Customer via SMS
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                   This opens your messaging app to send a pre-written ready-for-pickup/delivery text.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-sm-text border text-text-dark font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm-text font-medium rounded-xl transition-all active:scale-[0.98] flex justify-center items-center gap-2"
              >
                {isProcessing ? "Processing..." : "Confirm Completion"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}