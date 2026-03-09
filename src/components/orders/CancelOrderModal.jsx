import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { IconTrash, IconClose } from '../icons'; 
import Button from '../ui/Button';

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
    className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl border border-white max-w-sm w-full text-center"
>
    {/* TOP RIGHT CLOSE BUTTON */}
    <button 
        onClick={onClose}
        disabled={isCanceling}
        className="absolute top-5 right-5 p-2 rounded-full text-text-dark/20 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-30"
    >
        <IconClose className="w-5 h-5" />
    </button>

    {/* STEP 1: CONFIRMATION */}
    {step === 'confirm' && (
        <>
            <div className="w-16 h-16 flex items-center justify-center mx-auto ">
                <IconTrash className="w-8 h-8 text-text-dark" />
            </div>

            <h3 className="text-h3 font-bold text-text-dark ">Cancel Order?</h3>
            <p className="text-sm-text font-normal text-text-dark/60 mt-2 mb-8 px-2">
                Are you sure you want to cancel order <span className="font-bold text-text-dark">#{orderNumber}</span>? 
                This action will move the record to archives.
            </p>

            <div className="flex gap-3">
                <Button 
                    variant="danger" 
                    className="flex-1" 
                    onClick={() => setStep('reason')}
                >
                    Cancel Order
                </Button>
                <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={onClose}
                >
                    No, Keep it
                </Button>
            </div>
        </>
    )}

    {/* STEP 2: REASON SELECTION */}
    {step === 'reason' && (
        <div className="text-left">
            <h3 className="text-h3 font-bold text-text-dark text-center mb-1">Select Reason</h3>
            <p className="text-micro font-medium text-text-dark/70 text-center mb-6 uppercase">Order #{orderNumber}</p>

            <div className="space-y-2 mb-6">
                {PRESET_REASONS.map((reason) => (
                    <button
                        key={reason}
                        onClick={() => setSelectedReason(reason)}
                        className={`w-full px-4 py-3 rounded-xl text-sm-text font-medium border transition-all text-left flex items-center justify-between ${
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
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                        <textarea
                            autoFocus
                            placeholder="Type specific reason..."
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            className="w-full p-4 text-sm-text font-medium bg-slate-50 border border-slate-200 rounded-2xl outline-none min-h-[100px] resize-none focus:border-app-dark/30 transition-colors"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 text-red-500 text-micro font-bold rounded-xl border border-red-100 text-center uppercase tracking-tighter">
                    {errorMessage}
                </div>
            )}

            <div className="flex gap-3 mt-8">
                <Button 
                    variant="danger" 
                    className="flex-1" 
                    onClick={handleFinishCancellation}
                    isLoading={isCanceling}
                    disabled={!selectedReason || (selectedReason === "Other" && !customReason.trim())}
                >
                    {isCanceling ? "Processing..." : "Confirm Cancel"}
                </Button>
                <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => setStep('confirm')}
                    disabled={isCanceling}
                >
                    Back
                </Button>
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