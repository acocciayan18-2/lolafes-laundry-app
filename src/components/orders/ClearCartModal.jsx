import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { IconTrash, IconClose } from "../icons"; // ✨ Added IconClose
import Button from '../ui/Button';

const ClearCartModal = ({ isOpen, onCancel, onConfirm }) => {
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => {
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

  const handleConfirmAction = async (e) => {
    e.stopPropagation();
    if (isClearing) return;

    setIsClearing(true);
    setError(null);

    try {
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
            onClick={(e) => e.stopPropagation()}
            /* ✨ Added 'relative', 'p-8', and 'rounded-[2.5rem]' for design consistency */
            className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl border border-white max-w-sm w-full text-center"
          >
            
            {/* ✨ THE CLOSE BUTTON */}
            <button 
              onClick={onCancel}
              disabled={isClearing}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90 disabled:opacity-0"
            >
              <IconClose className="w-5 h-5" />
            </button>

            {/* ICON HEADER */}
            <div className="w-16 h-16  flex items-center justify-center mx-auto ">
              <IconTrash className="w-8 h-8 text-text-dark" />
            </div>
            
            <h3 className="text-h3 font-bold text-text-dark ">Clear Cart?</h3>
            <p className="text-sm-text font-normal text-text-dark/70 mt-2 mb-8 px-2">
              Changing the customer info will remove all items currently in the cart. Do you want to proceed?
            </p>

            {error && (
              <div className="mb-6 p-3 bg-red-50 text-red-600 text-micro font-bold rounded-xl border border-red-100 ">
                {error}
              </div>
            )}
            
            <div className="flex gap-3 w-full">
              <Button
                variant="danger"
                className="flex-1 order-1"
                onClick={handleConfirmAction}
                isLoading={isClearing}
              >
                {isClearing ? "Clearing..." : "Clear Cart"}
              </Button>

              <Button
                variant="secondary"
                className="flex-1 order-2"
                onClick={onCancel}
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