import { motion, AnimatePresence } from "framer-motion";
import { IconUsers, IconX } from "../icons";

const RemoveCustomerModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  customerName, 
  isDeleting, 
  errorMsg 
}) => {
  return (
    <AnimatePresence shadow>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm"
          onClick={() => !isDeleting && onClose()}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded-2xl shadow-2xl border border-white max-w-sm w-full text-center relative"
          >
            {/* TOP RIGHT CLOSE BUTTON */}
            <button 
              onClick={onClose}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-1.5 rounded-full text-text-dark/20 hover:text-text-dark/50 hover:bg-gray-100 transition-all disabled:opacity-30"
            >
              <IconX className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-app-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-app-dark/20">
              <IconUsers className="w-6 h-6 text-white" />
            </div>

            <h3 className="text-h3 font-bold text-text-dark">
              Remove Customer?
            </h3>

            <p className="text-sm-text text-text-dark/70 mt-2 mb-4 leading-snug">
              Are you sure you want to remove{" "}
              <span className="font-bold text-text-dark">
                {customerName} 
              </span>
              ? This action cannot be undone.
            </p>

            {errorMsg && (
              <div className="mb-4 p-2 bg-red-50 text-red-500 text-micro rounded border border-red-100 animate-in fade-in slide-in-from-top-1">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-row gap-3">
              <button
                className="flex-1 order-1 px-4 py-2 text-sm-text font-medium border border-app-dark rounded-lg transition-all hover:bg-gray-50 disabled:opacity-50"
                onClick={onClose}
                disabled={isDeleting}
              >
                Cancel
              </button>

              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm-text font-medium bg-red-500 text-white rounded-lg transition-all hover:bg-red-600 disabled:opacity-70 disabled:cursor-wait shadow-sm shadow-red-200"
                onClick={onConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RemoveCustomerModal;