import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconHandover, IconDelivery, IconClose } from '../icons';
import Button from '../ui/Button';

/**
 * @description Safe monetary parsing to prevent JS floating point errors and NaN crashes.
 * @param {any} val - Raw monetary input
 * @returns {number} Clean integer/float up to 2 decimal places.
 */
const parseMoney = (val) => {
  const num = Number(val);
  if (isNaN(num) || num < 0) return 0;
  // Rounds to 2 decimal places safely to prevent 0.300000000004 issues
  return Math.round(num * 100) / 100; 
};

/**
 * @component ChangeHandoverModal
 * @description Securely manages handover method and fee recalculations.
 */
export default function ChangeHandoverModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  currentMethod, 
  currentTotal, 
  currentFee 
}) {
  // --- STATE ---
  const [fee, setFee] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedMethod, setLockedMethod] = useState(currentMethod);
  
  const isSwitchingToDelivery = lockedMethod === 'pickup';
  
  // --- REFS ---
  const modalRef = useRef(null);
  const isMounted = useRef(false);

  // --- LIFECYCLE ---
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // ✨ QA FIX: Snapshot the state exactly when the modal opens.
      setLockedMethod(currentMethod);
      setFee("0");
      setIsSubmitting(false);
    }
    // ✨ QA FIX: Intentionally omitted `currentMethod` from dependencies.
    // If the parent updates the order state mid-confirmation, the modal will NOT 
    // re-evaluate this effect, preventing the UI from abruptly flipping mid-animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); 

  // Keyboard accessibility and focus trap
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isSubmitting) handleClose(e);
    };
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
      modalRef.current?.focus();
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, isSubmitting]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- HANDLERS ---

  const handleClose = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!isSubmitting && typeof onClose === 'function') {
      onClose();
    }
  }, [isSubmitting, onClose]);

  const handleFeeChange = useCallback((e) => {
    // SECURITY: Input sanitization - only allow digits, prevent massive string overflows
    let val = e.target.value.replace(/\D/g, '').substring(0, 4); // Max 9999
    
    // Prevent multiple leading zeros (e.g., '005' -> '5')
    if (val.length > 1 && val.startsWith('0')) {
      val = val.replace(/^0+/, '');
    }
    setFee(val);
  }, []);

  const handleConfirm = useCallback(async (e) => {
    if (e) e.stopPropagation(); 
    if (isSubmitting) return; // Race condition guard
    
    setIsSubmitting(true);
    
    // ⚠️ ARCHITECTURAL NOTE: FRONTEND VS BACKEND
    // This calculation provides instant UI feedback. The true final transaction 
    // amounts MUST be recalculated and validated in the Backend prior to saving.
    let finalFee = 0;
    const safeTotal = parseMoney(currentTotal);
    const safeCurrentFee = parseMoney(currentFee);
    let finalTotal = safeTotal;

    try {
      if (typeof onConfirm !== 'function') throw new Error("Missing confirm handler.");

      if (isSwitchingToDelivery) {
        finalFee = parseMoney(fee);
        finalTotal = parseMoney(safeTotal + finalFee); 
        await onConfirm('delivery', finalFee, finalTotal);
      } else {
        finalTotal = Math.max(0, parseMoney(safeTotal - safeCurrentFee));
        await onConfirm('pickup', 0, finalTotal);
      }
    } catch (error) {
      console.error("[HandoverModal] Update error:", error);
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false); 
      }
    }
  }, [isSubmitting, currentTotal, currentFee, isSwitchingToDelivery, fee, onConfirm]);

  // --- DERIVED UI STATE ---
  const calculatedTotal = useMemo(() => {
    const safeTotal = parseMoney(currentTotal);
    if (isSwitchingToDelivery) {
      return parseMoney(safeTotal + parseMoney(fee));
    }
    return Math.max(0, parseMoney(safeTotal - parseMoney(currentFee)));
  }, [currentTotal, fee, currentFee, isSwitchingToDelivery]);


  // --- RENDER ---
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div 
          onClick={handleClose} 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="handover-modal-title"
        >
          <motion.div 
            ref={modalRef}
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0, y: 10 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden focus:outline-none"
          >
            {/* Top Right Close Button */}
            <button 
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label="Close modal"
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50 ${
                isSubmitting ? 'opacity-30 cursor-not-allowed' : 'text-slate-400 hover:text-text-dark hover:bg-slate-100'
              }`}
            >
              <IconClose className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Header */}
            <header className="text-center mb-3">
              <div className="w-12 h-12 flex items-center justify-center mx-auto" aria-hidden="true">
                {isSwitchingToDelivery ? <IconDelivery className="w-6 h-6 text-blue-600" /> : <IconHandover className="w-6 h-6 text-amber-600" />}
              </div>
              <h3 id="handover-modal-title" className="text-lg font-bold text-text-dark">
                Change to {isSwitchingToDelivery ? "Delivery" : "Pickup"}
              </h3>
              <p className="text-sm-text font-normal text-text-dark mt-1 px-4" aria-live="polite">
                {isSwitchingToDelivery 
                  ? "Enter the delivery fee to apply to this order." 
                  : `This will remove the ₱${parseMoney(currentFee).toLocaleString()} delivery fee.`}
              </p>
            </header>

            {/* Content: Fee Input */}
            {isSwitchingToDelivery && (
              <div className={`mb-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 transition-opacity ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                <label htmlFor="delivery-fee-input" className="block text-micro font-bold text-blue-800 uppercase tracking-wider mb-2">
                  Delivery Fee (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm-text font-bold text-blue-600" aria-hidden="true">₱</span>
                  <input
                    id="delivery-fee-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    value={fee}
                    onChange={handleFeeChange}
                    placeholder="0"
                    onFocus={(e) => e.target.select()} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && fee !== "") handleConfirm(e);
                    }}
                    disabled={isSubmitting}
                    aria-required="true"
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-blue-200 rounded-xl font-bold text-text-dark focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm disabled:bg-slate-50"
                  />
                </div>
              </div>
            )}

            <AnimatePresence>
              {isSwitchingToDelivery && Number(fee) > 0 && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-micro text-text-dark/90 text-center mb-2 italic"
                  role="alert"
                >
                 <strong>Reminder:</strong> Please collect the added amount of ₱{fee} for delivery.
                </motion.p>
              )}
            </AnimatePresence>

            {/* Total Preview */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center mb-2" aria-live="polite">
              <span className="text-sm-text  text-text-dark/80">New Total</span>
              <span className="text-h3 font-bold text-text-dark">
                ₱{calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Actions */}
            <footer className="flex gap-3 mt-4 w-full">
              <Button 
                variant="secondary" 
                className="flex-1 rounded-xl" 
                onClick={handleClose} 
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                className="flex-1 rounded-xl"
                onClick={handleConfirm} 
                disabled={isSubmitting || (isSwitchingToDelivery && fee === "")} 
                isLoading={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Confirm"}
              </Button>
            </footer>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}