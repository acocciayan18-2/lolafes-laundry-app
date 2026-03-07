import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; // 1. Import Portal
import { IconCheckCircle, IconWallet, IconCreditCard, IconGCash } from '../icons';

const getPaymentIcon = (name) => {
  const lowerName = name?.toLowerCase() || "";
  if (lowerName.includes('cash')) return <IconWallet className="w-5 h-5 text-green-600" />;
  if (lowerName.includes('gcash')) return <IconGCash className="w-5 h-5 text-blue-600" />;
  return <IconCreditCard className="w-5 h-5 text-slate-600" />;
};

const PaymentUpdateModal = ({ isOpen, onClose, onConfirm, orderNumber, methods }) => {
  const [step, setStep] = useState(1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsUpdating(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      // ✨ FIXED: Call onClose() directly since we already check !isUpdating right here
      if (e.key === 'Escape' && !isUpdating) onClose(); 
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, isUpdating, onClose]); 

  const handleClose = () => {
    if (isUpdating) return;
    onClose();
  };

  const handleMethodSelect = async (methodName) => {
    if (isUpdating) return;
    setIsUpdating(true);
    setErrorMessage(null);
    try {
      await onConfirm(methodName);
    } catch (error) {
      setErrorMessage(error.message || "Update failed. Please try again.");
      setIsUpdating(false);
    }
  };

  // 2. Wrap the entire return in createPortal
  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* BACKDROP */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0  bg-app-dark/40 backdrop-blur-sm"
          />

          {/* MODAL BODY */}
         <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white p-6 rounded-2xl shadow-2xl border border-white max-w-sm w-full text-center overflow-hidden"
          >
            {/* CLOSE BUTTON */}
            <button 
              onClick={handleClose}
              disabled={isUpdating}
              className="absolute top-4 right-4 p-1 rounded-full text-text-dark/20 hover:text-text-dark/50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                /* STEP 1: CONFIRMATION */
                <motion.div 
                  key="confirm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconCheckCircle className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-h3 font-bold text-text-dark">Confirm Payment?</h3>
                  <p className="text-sm-text text-text-dark/70 leading-relaxed mb-6">
                    Mark order <span className="font-bold text-text-dark">#{orderNumber}</span> as fully paid? This will finalize the billing for this transaction.
                  </p>

                  <div className="flex gap-3">
                    <button 
                      className="flex-1 h-11 text-sm-text font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all"
                      onClick={() => setStep(2)}
                    >
                      Yes, Paid
                    </button>
                    <button 
                      className="flex-1 h-11 text-sm-text font-medium rounded-lg border border-app-dark text-text-dark hover:bg-slate-50 transition-all"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* STEP 2: METHOD SELECTION */
                <motion.div 
                  key="select"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-left mb-2">
                    <button 
                      onClick={() => setStep(1)} 
                      disabled={isUpdating}
                      className="text-micro font-bold text-blue-600 tracking-widest hover:text-blue-700 disabled:opacity-50"
                    >
                      ← Back
                    </button>
                    <h3 className="text-h3 font-medium text-text-dark mt-1">Select Method</h3>
                  </div>

                  {errorMessage && (
                    <div className="p-2 bg-red-50 text-red-500 text-micro rounded-lg border border-red-100">
                      {errorMessage}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {methods.map((method) => (
                      <button
                        key={method.id}
                        disabled={isUpdating}
                        onClick={() => handleMethodSelect(method.name)}
                        className={`w-full p-4 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-green-300 hover:shadow-md transition-all group active:scale-[0.98] ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div >
                            {getPaymentIcon(method.name)}
                          </div>
                          <span className="font-medium text-sm text-text-dark">{method.name}</span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-green-500 transition-colors" />
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-text-dark/40 font-medium">
                    {isUpdating ? "Finalizing transaction..." : "Choose how the customer settled the bill."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body // 3. Mount to Body
  );
};

export default PaymentUpdateModal;