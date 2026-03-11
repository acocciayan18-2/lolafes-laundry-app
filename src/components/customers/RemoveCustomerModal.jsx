import { motion, AnimatePresence } from "framer-motion";
import { IconUsers, IconX } from "../icons";
import Button from "../ui/Button";

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
  className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-white max-w-sm w-full text-center relative"
>
  {/* TOP RIGHT CLOSE BUTTON */}
  <button 
    onClick={onClose}
    disabled={isDeleting}
    className="absolute top-5 right-5 p-2 rounded-full text-text-dark/20 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-30"
  >
    <IconX className="w-5 h-5" />
  </button>

  <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3">
    <IconUsers className="w-8 h-8 text-text-dark" />
  </div>

  <h3 className="text-h3 font-bold text-text-dark ">
    Remove Customer?
  </h3>

  <p className="text-sm-text font-normal text-text-dark/60 mt-2 mb-8 leading-snug px-2">
    Are you sure you want to remove{" "}
    <span className="font-bold text-text-dark">
      {customerName} 
    </span>
    ? This action cannot be undone.
  </p>

  {errorMsg && (
    <div className="mb-6 p-3 bg-red-50 text-red-600 text-micro font-bold rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-1 uppercase">
      {errorMsg}
    </div>
  )}

  {/* ✨ REFACTORED BUTTONS USING COMPONENT */}
  <div className="flex flex-row gap-3 w-full">
    <Button
      variant="secondary"
      className="flex-1 order-2"
      onClick={onClose}
      disabled={isDeleting}
    >
      Cancel
    </Button>

    <Button
      variant="danger"
      className="flex-1 order-1"
      onClick={onConfirm}
      isLoading={isDeleting}
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </Button>
  </div>
</motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RemoveCustomerModal;