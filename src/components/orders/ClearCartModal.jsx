import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { IconTrash } from "../icons";

const ClearCartModal = ({ isOpen, onCancel, onConfirm }) => {
  // 1. States for handling async operations and errors
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState(null);

  // 2. Reset states and handle body scroll / Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      // Prevent closing if an operation is currently running
      if (e.key === 'Escape' && !isClearing) onCancel();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
      setIsClearing(false);
      setError(null);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onCancel, isClearing]);

  // 3. Secure confirmation wrapper to prevent double-clicks
  const handleConfirmAction = async (e) => {
    e.stopPropagation();
    if (isClearing) return;

    setIsClearing(true);
    setError(null);

    try {
      // We await this just in case your onConfirm syncs with Firebase/LocalForage
      await onConfirm(); 
    } catch (err) {
      console.error("Failed to clear cart:", err);
      setError("Unable to clear the cart right now. Please try again.");
      setIsClearing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        /* BACKDROP: Clicking outside triggers onCancel */
        <div 
          onClick={!isClearing ? onCancel : undefined}
          className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-app-dark/20 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            /* STOP PROPAGATION: Prevents modal from closing when clicking inside it */
            onClick={(e) => e.stopPropagation()}
            className="bg-white backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white max-w-sm w-full text-center"
          >
            <div className="w-12 h-12 bg-app-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <IconTrash className="w-6 h-6 text-white" />
            </div>
            
            <h3 className="text-h3 font-bold text-text-dark">Clear Cart?</h3>
            <p className="text-sm-text text-text-dark/70 mt-2 mb-4">
              Changing the customer info will remove all items currently in the cart. Do you want to proceed?
            </p>

            {/* ERROR DISPLAY: Only shows if the backend/store fails */}
            {error && (
              <div className="mb-4 p-2 bg-red-50 text-red-500 text-xs rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            <div className="flex gap-3 mt-2">
              
              <button 
                className="flex-1 px-4 py-2 text-sm-text font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-70 disabled:cursor-wait"
                onClick={handleConfirmAction}
                disabled={isClearing}
              >
                {isClearing ? "Clearing..." : "Clear Cart"}
              </button>
              <button 
                className="flex-1 px-4 py-2 text-sm-text font-medium rounded-lg border border-app-dark text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onCancel}
                disabled={isClearing}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ClearCartModal;