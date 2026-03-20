import React, { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IconUsers, IconX } from "../icons";
import Button from "../ui/Button";

/**
 * @component RemoveCustomerModal
 * @description Enterprise-grade confirmation modal for destructive customer deletion actions.
 */
const RemoveCustomerModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  customerName, 
  isDeleting, 
  errorMsg 
}) => {
  // --- REFS ---
  const modalRef = useRef(null);

  // --- DATA GUARDS ---
  // Defensively ensure the name is a string and truncate to prevent UI bloat
  const safeCustomerName = typeof customerName === 'string' 
    ? customerName.substring(0, 100) 
    : "Unknown Customer";

  // --- LIFECYCLE & A11Y ---
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === "Escape" && !isDeleting && typeof onClose === 'function') {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    
    // Shift focus to the modal container for screen reader context
    modalRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, isDeleting, onClose]);

  // --- HANDLERS (Memoized) ---
  
  const handleClose = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!isDeleting && typeof onClose === 'function') {
      onClose();
    }
  }, [isDeleting, onClose]);

  /**
   * ⚠️ ARCHITECTURAL NOTE: FRONTEND VS BACKEND
   * This component acts purely as a UI gatekeeper. The actual `onConfirm` action 
   * must trigger a Backend function (e.g., Firestore Security Rules or Cloud Function) 
   * that explicitly validates the current user's authorization to delete this specific 
   * customer to prevent malicious API bypasses.
   */
  const handleConfirm = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!isDeleting && typeof onConfirm === 'function') {
      onConfirm();
    }
  }, [isDeleting, onConfirm]);

  // --- EARLY RETURN FOR SSR/PORTALS ---
  const portalNode = typeof document !== 'undefined' ? document.body : null;
  if (!portalNode) return null;

  // --- RENDER ---
  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm"
          onClick={handleClose} // Safe backdrop click
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-customer-title"
          aria-describedby="remove-customer-desc"
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()} // Prevent bubbling to backdrop
            className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-white max-w-sm w-full text-center relative focus:outline-none"
          >
            {/* TOP RIGHT CLOSE BUTTON */}
            <button 
              onClick={handleClose}
              disabled={isDeleting}
              aria-label="Cancel customer removal"
              className="absolute top-5 right-5 p-2 rounded-full text-text-dark/20 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark"
            >
              <IconX className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* HEADER ICON */}
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3" aria-hidden="true">
              <IconUsers className="w-8 h-8 text-text-dark" />
            </div>

            {/* CONTENT */}
            <h3 id="remove-customer-title" className="text-h3 font-bold text-text-dark">
              Remove Customer?
            </h3>

            <p id="remove-customer-desc" className="text-sm-text font-normal text-text-dark/60 mt-2 mb-8 leading-snug px-2">
              Are you sure you want to remove{" "}
              <span className="font-bold text-text-dark" title={customerName}>
                {safeCustomerName} 
              </span>
              ? This action cannot be undone.
            </p>

            {/* ERROR DISPLAY */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert" 
                  className="mb-6 p-3 bg-rose-50 text-rose-600 text-micro font-bold rounded-xl border border-rose-100 uppercase"
                >
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ACTIONS */}
            <div className="flex flex-row gap-3 w-full">
              <Button
                variant="secondary"
                className="flex-1 order-2"
                onClick={handleClose}
                disabled={isDeleting}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                className="flex-1 order-1"
                onClick={handleConfirm}
                isLoading={isDeleting}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalNode
  );
};

export default React.memo(RemoveCustomerModal);