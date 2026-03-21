import React, { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconClose, IconLock } from "../icons"; 
import Button from "../ui/Button"; 

export const SystemPinModal = ({
  isOpen,
  onClose,
  onSubmit,
  title = "System Access",
  pin,
  setPin,
  error,
  isProcessing = false,
  lockout = { isLocked: false, remaining: 0 },
  PIN_LENGTH = 6,
  hideClose = false 
}) => {
  const inputRef = useRef(null);

  // Auto-focus the input when the modal opens
  useEffect(() => {
    if (isOpen && !lockout.isLocked) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, lockout.isLocked]);

  const handlePinChange = (e) => {
    // Strictly allow only numbers
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= PIN_LENGTH) {
      setPin(value);
      
      // ✨ AUTO-SUBMIT: Instantly verify when the 6th digit is typed
      if (value.length === PIN_LENGTH && !isProcessing) {
        onSubmit(value);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.length === PIN_LENGTH && !isProcessing) {
      onSubmit(pin);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-modal-title"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center relative border border-slate-100"
        >
          {/* CONDITIONALLY RENDER: Only show close button if hideClose is false */}
          {!hideClose && (
            <button 
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              aria-label="Close security modal"
              className="absolute top-6 right-6 p-2 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all focus:ring-1 focus:ring-slate-200 outline-none"
            >
              <IconClose className="w-4 h-4" />
            </button>
          )}

          {/* Security Icon */}
          <div 
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
              lockout.isLocked ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <IconLock className="w-6 h-6" aria-hidden="true" />
          </div>

          <h3 id="pin-modal-title" className="text-xl font-bold text-slate-800">
            Security Verification
          </h3>
          <p className="text-sm-text text-slate-500 mt-2 mb-8">
            Please enter PIN to authorize <br />
            <span className="text-rose-500 font-semibold">{title}</span>
          </p>

          {lockout.isLocked ? (
            <div role="alert" className="bg-rose-50 p-4 rounded-2xl border border-rose-100 mb-6">
              <p className="text-micro font-bold text-rose-600 uppercase tracking-widest">Locked Out</p>
              <p className="text-sm-text text-rose-500 mt-1">Try again in {lockout.remaining} minutes.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={PIN_LENGTH}
                  value={pin}
                  onChange={handlePinChange}
                  disabled={isProcessing}
                  className={`w-full text-center text-3xl font-bold tracking-[0.5em] py-4 bg-slate-50 border-2 rounded-2xl transition-all outline-none focus:ring-0 ${
                    error 
                      ? 'border-rose-400 text-rose-600 focus:ring-rose-100' 
                      : 'border-slate-100 focus:border-slate-800 focus:ring-slate-100 '
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="••••••"
                  aria-label="6 digit security pin"
                  aria-invalid={!!error}
                />
              </div>

              {/* Error Region */}
              <div className="h-4" aria-live="assertive">
                {error && <p className="text-sm-text text-rose-500 ">{error}</p>}
              </div>

              <div className="flex flex-row gap-3">
                {/* ✨ REMOVED AUTHORIZE BUTTON */}
                
                {/* CONDITIONALLY RENDER: Only show Cancel button if hideClose is false */}
                {!hideClose && (
                  <Button
                    variant="outline"
                    type="button"
                    className="flex-1"
                    onClick={onClose}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};