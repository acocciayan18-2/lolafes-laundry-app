import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconTrash, IconClose } from '../icons'; 
import Button from '../ui/Button';

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const PRESET_REASONS = Object.freeze([
  "Customer changed mind",
  "Order entry error",
  "Wait time too long",
  "Pricing issue",
  "Other"
]);

const MAX_CUSTOM_REASON_LENGTH = 250;

// ==========================================
// UTILITY HELPERS
// ==========================================
/**
 * @description Sanitizes raw user input to mitigate basic XSS payloads before 
 * handing it off. NOTE: The backend MUST also sanitize and validate this data.
 * @param {string} input - Raw text input
 * @returns {string} Sanitized string
 */
const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return "";
  // Strips basic HTML tags to prevent simple script injections
  return input.replace(/[<>]/g, '').trim().substring(0, MAX_CUSTOM_REASON_LENGTH);
};

// ==========================================
// MAIN COMPONENT
// ==========================================
/**
 * @component CancelOrderModal
 * @description Enterprise-grade modal for securely capturing order cancellation reasons.
 */
const CancelOrderModal = ({ isOpen, onClose, onConfirm, orderNumber }) => {
  // --- STATE ---
  const [step, setStep] = useState('confirm'); // 'confirm' | 'reason'
  const [isCanceling, setIsCanceling] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // --- REFS ---
  const isMounted = useRef(false); // Guards against state updates on unmounted components
  const modalRef = useRef(null); // Used for A11y focus management

  // --- LIFECYCLE ---
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
      if (e.key === 'Escape' && !isCanceling) handleClose();
    };
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
      // A11y: Shift focus into modal for keyboard users
      modalRef.current?.focus();
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, isCanceling]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- HANDLERS ---

  const handleClose = useCallback(() => {
    if (!isCanceling && typeof onClose === 'function') {
      onClose();
    }
  }, [isCanceling, onClose]);

  const handleStepChange = useCallback((newStep) => {
    setStep(newStep);
    setErrorMessage(null);
  }, []);

  /**
   * @description Validates, sanitizes, and submits the cancellation reason.
   * Relies on backend to perform the final authoritative state change.
   */
  const handleFinishCancellation = useCallback(async () => {
    const rawReason = selectedReason === "Other" ? customReason : selectedReason;
    const sanitizedReason = sanitizeInput(rawReason);

    // 1. Strict Front-End Validation
    if (!sanitizedReason) {
      setErrorMessage("Please provide a valid cancellation reason.");
      return;
    }

    setIsCanceling(true);
    setErrorMessage(null);

    try {
      // 2. Execution (Assuming onConfirm returns a Promise)
      if (typeof onConfirm === 'function') {
        await onConfirm(sanitizedReason);
      }
    } catch (error) {
      // 3. Graceful Error Handling (Only update if still mounted)
      if (isMounted.current) {
        console.error("[CancelOrderModal] Error:", error?.code || error?.message);
        setErrorMessage(error?.message?.substring(0, 100) || "System error. Failed to cancel order.");
        setIsCanceling(false);
      }
    }
  }, [selectedReason, customReason, onConfirm]);

  // --- RENDER ---
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div 
          className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          onClick={handleClose} // Safe backdrop click
        >
          <motion.div 
            ref={modalRef}
            tabIndex={-1}
            key={step}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()} // Prevent bubbling to backdrop
            className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl border border-white max-w-sm w-full text-center focus:outline-none"
          >
            {/* TOP RIGHT CLOSE BUTTON */}
            <button 
              onClick={handleClose}
              disabled={isCanceling}
              aria-label="Close cancellation modal"
              className="absolute top-5 right-5 p-2 rounded-full text-text-dark/20 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark"
            >
              <IconClose className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* STEP 1: CONFIRMATION */}
            {step === 'confirm' && (
              <div aria-live="polite">
                <div className="w-16 h-16 flex items-center justify-center mx-auto" aria-hidden="true">
                  <IconTrash className="w-8 h-8 text-text-dark" />
                </div>

                <h3 id="cancel-modal-title" className="text-h3 font-bold text-text-dark ">Cancel Order?</h3>
                <p className="text-sm-text font-normal text-text-dark mt-2 mb-8 px-2">
                 Are you sure you want to cancel order <span className="font-bold text-text-dark whitespace-nowrap">#{orderNumber || "Unknown"}</span>?
                  This action will move the record to archives.
                </p>

                <div className="flex gap-3">
                  <Button 
                    variant="danger" 
                    className="flex-1" 
                    onClick={() => handleStepChange('reason')}
                  >
                    Cancel Order
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={handleClose}
                  >
                    No, Keep it
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: REASON SELECTION */}
            {step === 'reason' && (
              <div className="text-left" aria-live="polite">
                <h3 id="cancel-modal-title" className="text-h3 font-bold text-text-dark text-center mb-1">Select Reason</h3>
                <p className="text-micro   text-text-dark/70 text-center mb-6 uppercase">Order #{orderNumber}</p>

                <fieldset className="space-y-2 mb-6 border-none p-0 m-0">
                  <legend className="sr-only">Cancellation Reasons</legend>
                  {PRESET_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <button
                        key={reason}
                        onClick={() => setSelectedReason(reason)}
                        aria-pressed={isSelected}
                        className={`w-full px-4 py-3 rounded-xl text-sm-text   border transition-all text-left flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50 ${
                          isSelected 
                          ? "bg-app-dark text-white border-app-dark shadow-md" 
                          : "bg-slate-50 text-text-dark/60 border-slate-200 hover:border-app-dark/20"
                        }`}
                      >
                        {reason}
                      </button>
                    );
                  })}
                </fieldset>

                <AnimatePresence>
                  {selectedReason === "Other" && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: "auto", opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }} 
                      className="overflow-hidden mb-4"
                    >
                      <label htmlFor="custom-reason" className="sr-only">Type specific reason</label>
                      <textarea
                        id="custom-reason"
                        maxLength={MAX_CUSTOM_REASON_LENGTH}
                        placeholder="Type specific reason"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        disabled={isCanceling}
                        className="w-full p-4 text-sm-text   bg-slate-50 border border-slate-200 rounded-2xl outline-none min-h-[100px] resize-none focus:ring-0  transition-all disabled:opacity-50"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {errorMessage && (
                  <div role="alert" className="mb-4 p-3 bg-rose-50 text-rose-600 text-micro font-bold rounded-xl border border-rose-100 text-center uppercase tracking-tighter animate-fade-in">
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
                    onClick={() => handleStepChange('confirm')}
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