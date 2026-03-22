import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconTrash, IconClose } from '../icons'; 
import Button from '../ui/Button';

/**
 * @component ClearCartModal
 * @description Securely prompts the user before performing a destructive cart clear action.
 */
const ClearCartModal = ({ isOpen, onCancel, onConfirm }) => {
  // --- STATE ---
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState(null);

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

  // Handle initialization state only when opening
  useEffect(() => {
    if (isOpen) {
      setIsClearing(false);
      setError(null);
    }
  }, [isOpen]);

  // Handle A11y and Keyboard events
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isClearing) {
        handleCancel(e);
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
      // A11y: Trap focus inside modal
      modalRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, isClearing]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- HANDLERS ---

  const handleCancel = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!isClearing && typeof onCancel === 'function') {
      onCancel();
    }
  }, [isClearing, onCancel]);

  /**
   * @description Validates execution state and triggers the destructive confirm callback.
   */
  const handleConfirmAction = useCallback(async (e) => {
    if (e) e.stopPropagation();
    if (isClearing) return; // Race condition guard

    setIsClearing(true);
    setError(null);

    try {
      if (typeof onConfirm === 'function') {
        await onConfirm(); 
      } else {
        throw new Error("Missing confirmation handler.");
      }
    } catch (err) {
      if (isMounted.current) {
        console.error("[ClearCartModal] Action Failed:", err?.message || err);
        setError("Unable to clear the cart right now. Please try again.");
        setIsClearing(false);
      }
    }
  }, [isClearing, onConfirm]);

  // --- RENDER ---
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div 
          onClick={handleCancel}
          className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-app-dark/20 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-cart-title"
          aria-describedby="clear-cart-desc"
        >
          <motion.div 
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white p-6 rounded-3xl shadow-2xl border border-white max-w-sm w-full text-center focus:outline-none"
          >
            
            {/* CLOSE BUTTON */}
            <button 
              onClick={handleCancel}
              disabled={isClearing}
              aria-label="Close modal"
              className="absolute top-5 right-5 p-2 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark disabled:opacity-0"
            >
              <IconClose className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* ICON HEADER */}
            <div className="w-16 h-16 flex items-center justify-center mx-auto" aria-hidden="true">
              <IconTrash className="w-8 h-8 text-text-dark" />
            </div>
            
            <h3 id="clear-cart-title" className="text-h3 font-bold text-text-dark">Clear Cart?</h3>
            <p id="clear-cart-desc" className="text-sm-text font-normal text-text-dark mt-2 mb-8 px-2">
              Changing the customer info will remove all items currently in the cart. Do you want to proceed?
            </p>

            {/* ERROR DISPLAY */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="mb-6 p-3 bg-rose-50 text-rose-600 text-micro font-bold rounded-xl border border-rose-100"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* ACTIONS */}
            <div className="flex gap-3 w-full">
              <Button
                variant="danger"
                className="flex-1 order-1"
                onClick={handleConfirmAction}
                isLoading={isClearing}
                disabled={isClearing}
              >
                {isClearing ? "Clearing..." : "Clear Cart"}
              </Button>

              <Button
                variant="secondary"
                className="flex-1 order-2"
                onClick={handleCancel}
                disabled={isClearing}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ClearCartModal;