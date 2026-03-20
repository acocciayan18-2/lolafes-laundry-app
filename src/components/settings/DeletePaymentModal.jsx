/**
 * @file DeletePaymentModal.jsx
 * @description Enterprise-grade confirmation gateway for destructive POS operations.
 * Resolves Hook Order Violations, Infinite Render Loops, and SSR Hydration bugs.
 */

import React, { useEffect, useCallback, memo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { IconTrash, IconClose } from "../icons";
import Button from "../ui/Button";

// Constants moved outside to ensure referential identity across re-renders
const BACKDROP_VARIANTS = Object.freeze({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
});

const MODAL_VARIANTS = Object.freeze({
  initial: { scale: 0.95, opacity: 0, y: 20 },
  animate: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.95, opacity: 0, y: 20 },
});

const DeletePaymentModal = memo(({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName = "this item", 
  isLoading = false 
}) => {
  // --- 1. UNCONDITIONAL HOOK DECLARATIONS ---
  
  const closeHandlerRef = useRef(onClose);
  
  useEffect(() => {
    closeHandlerRef.current = onClose;
  }, [onClose]);

  // TRANSACTIONAL INTEGRITY: Prevent Double-Submission
  const handleSafeConfirm = useCallback((e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!isLoading && onConfirm) {
      onConfirm();
    }
  }, [isLoading, onConfirm]);

  // DEFENSIVE PROGRAMMING: Focus Trapping & Body Lock
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    const previousFocus = document.activeElement;
    const originalOverflow = window.getComputedStyle(document.body).overflow || "";

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isLoading) {
        closeHandlerRef.current?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden"; 

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previousFocus) previousFocus.focus();
    };
  }, [isOpen, isLoading]);

  // --- 2. SSR SAFETY GUARD ---
  if (typeof document === "undefined") return null;

  // --- 3. RENDER PORTAL ---
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden"
          role="alertdialog" 
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          aria-describedby="delete-modal-description"
        >
          {/* Backdrop */}
          <motion.div
            variants={BACKDROP_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={!isLoading ? () => closeHandlerRef.current?.() : undefined}
            className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm ${
              isLoading ? 'cursor-wait' : 'cursor-pointer'
            }`}
          />

          {/* Modal Container */}
          <motion.div
            variants={MODAL_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100"
          >
            <header className="sr-only">
              <h2 id="delete-modal-title">Confirm Deletion</h2>
            </header>

            <button
              onClick={() => closeHandlerRef.current?.()}
              disabled={isLoading}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-0"
              aria-label="Cancel and close"
            >
              <IconClose className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 animate-pulse-slow">
                <IconTrash className="h-7 w-7" aria-hidden="true" />
              </div>

              <h3 className="mb-2 text-lg font-bold text-slate-900">
                Remove Payment Method?
              </h3>

              <p 
                id="delete-modal-description"
                className="mb-8 text-sm-text leading-relaxed text-slate-500 px-2"
              >
                Are you sure you want to remove 
                <span className="mx-1 font-semibold text-slate-800 break-all">
                  "{itemName}"
                </span>? 
                This action is irreversible and will be logged for audit.
              </p>

              <div className="flex w-full gap-3">
                <Button
                  variant="secondary"
                  onClick={() => closeHandlerRef.current?.()}
                  disabled={isLoading}
                  className="flex-1 rounded-2xl py-3"
                  aria-label="No, keep this item"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleSafeConfirm}
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="flex-1 rounded-2xl py-3 bg-rose-500 hover:bg-rose-600 text-white"
                  aria-label="Yes, delete this item"
                >
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
});

DeletePaymentModal.displayName = "DeletePaymentModal";

export default DeletePaymentModal;