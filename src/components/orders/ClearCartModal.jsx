import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { IconTrash } from "../icons";

const ClearCartModal = ({ isOpen, onCancel, onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-app-dark/20 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white max-w-sm w-full text-center"
          >
            <div className="w-12 h-12 bg-app-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <IconTrash className="w-6 h-6 text-white" />
            </div>
            
            <h3 className="text-h3 font-bold text-text-dark">Clear Cart?</h3>
            <p className="text-sm-text text-text-dark/70 mt-2 mb-6">
              Changing the customer info will remove all items currently in the cart. Do you want to proceed?
            </p>
            
            <div className="flex gap-3">
              <button 
                className="flex-1 px-4 py-2 text-sm-text font-medium rounded-lg border border-app-dark text-gray-700 hover:bg-gray-50 transition-all"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button 
                className="flex-1 px-4 py-2 text-sm-text font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all"
                onClick={onConfirm}
              >
                Clear Cart
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ClearCartModal;