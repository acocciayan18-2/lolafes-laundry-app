import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconStatusCompleted, IconClose } from "../icons";
import Button from "../ui/Button";

/**
 * @component CompleteOrderModal
 * @description Enterprise-grade modal for securely confirming order completion and SMS triggers.
 * Handles graceful degradation for anonymous (Walk-In) customers.
 */
export default function CompleteOrderModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  orderNumber, 
  customerName,
  isWalkIn = false // ✨ NEW PROP: Tells the modal if the customer is anonymous
}) {
  // --- STATE ---
  const [sendSms, setSendSms] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- REFS ---
  const isMounted = useRef(false);
  const modalRef = useRef(null);

  // --- LIFECYCLE ---
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // ✨ FIX: If Walk-In, definitively force SMS off. Otherwise, default to true.
      setSendSms(!isWalkIn);
      setIsProcessing(false);
    }
  }, [isOpen, isWalkIn]);

  const handleClose = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!isProcessing && typeof onClose === 'function') {
      onClose();
    }
  }, [isProcessing, onClose]);

  // A11y Keyboard Handlers & Focus Trap
useEffect(() => {
  const handleEsc = (e) => {
    if (e.key === 'Escape' && !isProcessing) {
      handleClose(e);
    }
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
}, [isOpen, isProcessing, handleClose]);

  // --- HANDLERS ---

  

  const handleToggleSms = useCallback((e) => {
    // ✨ FIX: Hard lock the toggle if it's a Walk-In guest
    if (isWalkIn) return;
    
    if (!isProcessing) {
      setSendSms(e.target.checked);
    }
  }, [isProcessing, isWalkIn]);

  const handleConfirmAction = useCallback(async (e) => {
    if (e) e.stopPropagation();
    if (isProcessing) return; 

    setIsProcessing(true);

    try {
      if (typeof onConfirm === 'function') {
        // ✨ QA Check: Ensure we strictly pass `false` if it's a walk-in, 
        // ignoring any DOM manipulation attempts.
        const finalSmsState = isWalkIn ? false : sendSms;
        await onConfirm(finalSmsState);
      } else {
        throw new Error("Missing confirmation handler.");
      }
    } catch (error) {
      console.error("[CompleteOrderModal] Confirmation Failed:", error?.message || error);
    } finally {
      if (isMounted.current) {
        setIsProcessing(false);
      }
    }
  }, [isProcessing, onConfirm, sendSms, isWalkIn]);


  // --- RENDER ---
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div 
          onClick={handleClose} 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-modal-title"
          aria-describedby="complete-modal-desc"
        >
          <motion.div 
            ref={modalRef}
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 relative focus:outline-none"
          >
            {/* CLOSE BUTTON */}
            <button 
              onClick={handleClose}
              disabled={isProcessing}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50"
            >
              <IconClose className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* HEADER */}
            <header className="text-center mb-6 mt-2">
              <div className="w-16 h-16 text-emerald-600 flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                <IconStatusCompleted className="w-8 h-8" />
              </div>
              <h3 id="complete-modal-title" className="text-xl font-bold text-text-dark tracking-tight">
                Mark as Completed?
              </h3>
              <p id="complete-modal-desc" className="text-sm-text font-normal text-text-dark/70 mt-1">
                Order <span className="font-bold">#{orderNumber || "---"}</span> for {customerName || "Customer"}
              </p>
            </header>

            {/* CUSTOM CHECKBOX UI / WARNING BANNER */}
            <div className={`p-4 rounded-xl mb-6 transition-all ${
              isProcessing ? 'opacity-60 pointer-events-none' : ''
            } ${
              isWalkIn ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'
            }`}>
              
              {/* ✨ NEW UI: Conditional Rendering based on Walk-In status */}
              {isWalkIn ? (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-amber-500" aria-hidden="true">
                    {/* Simple Exclamation Triangle Icon */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm-text font-bold text-amber-900 leading-tight">
                      SMS Disabled
                    </p>
                    <p className="text-micro text-amber-800/80 mt-1 leading-relaxed">
                      This is an anonymous walk-in order. No phone number is available for SMS notification.
                    </p>
                  </div>
                </div>
              ) : (
                <label htmlFor="sms-toggle" className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center mt-0.5">
                    <input 
                      id="sms-toggle"
                      type="checkbox" 
                      checked={sendSms}
                      onChange={handleToggleSms}
                      disabled={isProcessing}
                      aria-checked={sendSms}
                      className="peer sr-only"
                    />
                    {/* Visual Checkbox */}
                    <div className="w-5 h-5 bg-white border-2 border-slate-300 rounded transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/50 peer-focus-visible:ring-offset-1" aria-hidden="true"></div>
                    <svg className="absolute w-5 h-5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm-text  text-text-dark group-hover:text-text-dark transition-colors flex items-center gap-1.5">
                      Notify Customer via SMS
                    </p>
                    <p className="text-micro text-slate-500 mt-0.5 leading-relaxed">
                     This opens your messaging app to send a pre-written ready-for-pickup/delivery text.
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* ACTIONS */}
            <footer className="flex gap-3 w-full">
              <Button 
                variant="secondary" 
                className="flex-1" 
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              
              <Button 
                variant="success"
                className="flex-[2]" 
                onClick={handleConfirmAction}
                isLoading={isProcessing}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Confirm Completion"}
              </Button>
            </footer>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}