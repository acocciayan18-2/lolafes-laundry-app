import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconHandover, IconDelivery, IconClose, IconLoading } from '../icons';

export default function ChangeHandoverModal({ isOpen, onClose, onConfirm, currentMethod, currentTotal, currentFee }) {
  const [fee, setFee] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [lockedMethod, setLockedMethod] = useState(currentMethod);

 useEffect(() => {
    if (isOpen) {
      setLockedMethod(currentMethod);
      setFee("0");
      setIsSubmitting(false);
    }
  }, [isOpen, currentMethod]); 

  const isSwitchingToDelivery = lockedMethod === 'pickup';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    let finalFee = 0;
    let finalTotal = Number(currentTotal);

    try {
      if (isSwitchingToDelivery) {
        finalFee = Number(fee) || 0;
        finalTotal += finalFee; 
        await onConfirm('delivery', finalFee, finalTotal);
      } else {
        finalTotal = Math.max(0, finalTotal - Number(currentFee || 0));
        await onConfirm('pickup', 0, finalTotal);
      }
    } finally {
      setIsSubmitting(false); 
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          onClick={() => { if (!isSubmitting) onClose(); }} 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden"
          >
            {/* Top Right Close Button */}
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                isSubmitting ? 'opacity-30 cursor-not-allowed' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <IconClose className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-3">
              <div className="w-12 h-12 bg-app-dark/5 rounded-full flex items-center justify-center mx-auto mb-2">
                {isSwitchingToDelivery ? <IconDelivery className="w-6 h-6 text-blue-600" /> : <IconHandover className="w-6 h-6 text-amber-600" />}
              </div>
              <h3 className="text-lg font-bold text-text-dark">Change to {isSwitchingToDelivery ? "Delivery" : "Pickup"}</h3>
              <p className="text-sm text-text-dark/60 mt-1 px-4">
                {isSwitchingToDelivery 
                  ? "Enter the delivery fee to apply to this order." 
                  : `This will remove the ₱${currentFee} delivery fee.`}
              </p>
            </div>

            {/* Content: Fee Input (Only if switching to delivery) */}
            {isSwitchingToDelivery && (
              <div className={`mb-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 transition-opacity ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-micro font-bold text-blue-800 uppercase tracking-wider mb-2">Delivery Fee (₱)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-600">₱</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={fee}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length > 1 && val.startsWith('0')) {
                        val = val.replace(/^0+/, '');
                      }
                      if (val.length <= 3) setFee(val);
                    }}
                    placeholder="0"
                    onFocus={(e) => e.target.select()} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && fee !== "") handleConfirm();
                    }}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-blue-200 rounded-xl font-bold text-text-dark focus:outline-none focus:border-blue-400 transition-colors shadow-sm"
                  />
                </div>
              </div>
            )}

            {isSwitchingToDelivery && Number(fee) > 0 && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-text-dark/90 text-center mb-2 italic"
              >
               <strong> Reminder: </strong>Please collect the added amount of ₱{fee} for delivery from the customer.
              </motion.p>
            )}

            {/* Total Preview */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center mb-2">
              <span className="text-sm-text font-medium text-slate-500 ">New Total</span>
              <span className="text-h3 font-bold text-text-dark">
                ₱{isSwitchingToDelivery 
                  ? (Number(currentTotal) + (Number(fee) || 0)).toLocaleString() 
                  : Math.max(0, Number(currentTotal) - Number(currentFee || 0)).toLocaleString()
                }
              </span>
            </div>

            
            

            {/* Actions */}
            <div className="flex gap-3 mt-2">
              <button 
                onClick={onClose} 
                disabled={isSubmitting}
                className={`flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 transition-colors ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm} 
                disabled={isSubmitting || (isSwitchingToDelivery && fee === "")}
                className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 rounded-xl text-sm font-medium text-white transition-all 
                  ${(isSwitchingToDelivery && fee === "") || isSubmitting
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : 'bg-app-dark hover:bg-app-dark/90 active:scale-95'}`}
              >
                {isSubmitting ? (
                  <>
                    <IconLoading className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}