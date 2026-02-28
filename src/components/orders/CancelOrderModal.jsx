import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { IconTrash } from '../icons'; 

const CancelOrderModal = ({ isOpen, onClose, onConfirm, orderNumber }) => {
  // Prevent background scroll and handle Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        /* BACKDROP: Clicking here triggers onClose (click outside) */
        <div 
          onClick={onClose}
          className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-app-dark/20 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            /* STOP PROPAGATION: Clicking the content area won't close the modal */
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white max-w-sm w-full text-center"
          >
            {/* TOP RIGHT CLOSE BUTTON */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full text-text-dark/20 hover:text-text-dark/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Circle Icon Header */}
            <div className="w-12 h-12 bg-app-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <IconTrash className="w-6 h-6 text-white" />
            </div>

            {/* Title & Description */}
            <h3 className="text-h3 font-bold text-text-dark">Cancel Order?</h3>
            <p className="text-sm-text text-text-dark/70 mt-2 mb-6">
              Are you sure you want to cancel order <span className="font-medium text-text-dark">#{orderNumber}</span>? 
              This action will move the record to archives and cannot be undone.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button 
                className="flex-1 px-4 py-2 text-sm-text font-medium rounded-lg transition-all !bg-red-500 text-white hover:bg-red-600 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CancelOrderModal;