import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { IconTrash, IconLoading } from '../icons'; 

const PRESET_REASONS = [
  "Customer changed mind",
  "Order entry error",
  "Wait time too long",
  "Pricing issue",
  "Other"
];

const CancelOrderModal = ({ isOpen, onClose, onConfirm, orderNumber }) => {
  const [step, setStep] = useState('confirm'); // 'confirm' or 'reason'
  const [isCanceling, setIsCanceling] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setIsCanceling(false);
      setErrorMessage(null);
      setSelectedReason("");
      setCustomReason("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isCanceling) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, isCanceling]);

  const handleFinishCancellation = async () => {
    const finalReason = selectedReason === "Other" ? customReason : selectedReason;
    if (!finalReason.trim()) {
      setErrorMessage("Please select a reason.");
      return;
    }

    setIsCanceling(true);
    setErrorMessage(null);
    try {
      await onConfirm(finalReason);
    } catch (error) {
      setErrorMessage(error.message || "Failed to cancel.");
      setIsCanceling(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div 
          onClick={!isCanceling ? onClose : undefined}
          className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div 
            key={step}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white p-6 rounded-2xl shadow-2xl border border-white max-w-sm w-full text-center"
          >
            {/* TOP RIGHT CLOSE BUTTON (Original Design) */}
            <button 
              onClick={onClose}
              disabled={isCanceling}
              className="absolute top-4 right-4 p-1 rounded-full text-text-dark/20 hover:text-text-dark/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* STEP 1: YOUR ORIGINAL CONFIRMATION DESIGN */}
            {step === 'confirm' && (
              <>
                <div className="w-12 h-12 bg-app-dark rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconTrash className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-h3 font-bold text-text-dark">Cancel Order?</h3>
                <p className="text-sm-text text-text-dark/70 mt-2 mb-6">
                  Are you sure you want to cancel order <span className="font-medium text-text-dark">#{orderNumber}</span>? 
                  This action will move the record to archives and cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button 
                    className="flex-1 px-4 py-2 text-sm-text font-medium rounded-lg transition-all !bg-red-500 text-white hover:bg-red-600 active:scale-95"
                    onClick={() => setStep('reason')}
                  >
                    Cancel Order
                  </button>
                  <button 
                    className="flex-1 px-4 py-2 text-sm-text font-medium rounded-lg transition-all !border !border-1 !border-app-dark text-text-dark hover:bg-slate-50"
                    onClick={onClose}
                  >
                    No, Keep it
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: REASON SELECTION (Matching Original Style) */}
            {step === 'reason' && (
              <div className="text-left">
                <h3 className="text-h3 font-bold text-text-dark text-center mb-1">Cancel Order #{orderNumber}</h3>
                <p className="text-micro font-medium text-text-dark/40 text-center mb-3">Select a reason for cancellation</p>

                <div className="space-y-2 mb-4">
                  {PRESET_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm-text font-medium border transition-all text-left flex items-center justify-between ${
                        selectedReason === reason 
                        ? "bg-app-dark text-white border-app-dark shadow-md" 
                        : "bg-slate-50 text-text-dark/60 border-slate-200 hover:border-app-dark/20"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {selectedReason === "Other" && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden mb-4">
                      <textarea
                        autoFocus
                        placeholder="Type specific reason..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        className="w-full p-3 text-sm-text font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[80px] resize-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {errorMessage && (
                  <div className="mb-4 p-2 bg-red-50 text-red-500 text-micro font-medium rounded-lg border border-red-100 text-center uppercase">
                    {errorMessage}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button 
                    className="flex-1 px-4 py-2 text-sm-text font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    onClick={handleFinishCancellation}
                    disabled={isCanceling || !selectedReason || (selectedReason === "Other" && !customReason.trim())}
                  >
                    {isCanceling ? <IconLoading className="w-4 h-4 animate-spin" /> : "Cancel Order"}
                  </button>
                  <button 
                    className="flex-1 px-4 py-2 text-sm-text font-medium rounded-lg border border-app-dark text-text-dark hover:bg-slate-50"
                    onClick={() => setStep('confirm')}
                    disabled={isCanceling}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CancelOrderModal;