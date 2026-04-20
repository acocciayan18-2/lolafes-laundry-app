/**
 * @file CleanupPINModal.jsx
 * @description Secure, accessible, and high-performance PIN verification gateway.
 * Resolves Destructuring Type Errors and Zustand Selector Anti-patterns.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconLock, IconClose } from '../icons'; 
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import Button from '../ui/Button';

const PIN_LENGTH = 6;
const SHAKE_ANIMATION = Object.freeze({ 
  x: [-10, 10, -10, 10, 0], 
  transition: { duration: 0.4 } 
});

export default function CleanupPINModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "this action", 
  isProcessing 
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [lockout, setLockout] = useState({ isLocked: false, remaining: 0 });
  
  // Ref for focus management
  const inputRef = useRef(null);

  // 🚨 QA FIX: Removed 'useCallback' from inside the selector. 
  // Zustand selectors should be pure functions. Wrapping them in useCallback causes 
  // React hook order violations in some strict-mode edge cases.
  const verifyPINAtSource = useSettingsStore((state) => state.verifyPIN);

  // 1. Initialize/Reset Effect
  useEffect(() => {
    if (!isOpen) return;
    
    setPin("");
    setError("");
    
    // Defensive Focus Trapping
    const timer = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isOpen]);

  // 2. Optimized Handlers
  const handlePinChange = useCallback((e) => {
    // Sanitization: Strip all non-digits immediately
    const value = e.target.value.replace(/\D/g, '').substring(0, PIN_LENGTH);
    setPin(value);
    if (error) setError("");
  }, [error]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (lockout.isLocked || pin.length < PIN_LENGTH || isProcessing) return;

    try {
      const result = await verifyPINAtSource(pin);

      // 🛡️ CRITICAL ARCHITECTURE FIX: Polymorphic Response Handling
      // Safely handles both legacy Boolean returns and new Object returns from the store
      const isSuccess = result && typeof result === 'object' ? result.success : result === true;
      const isLocked = result && typeof result === 'object' ? result.locked : false;
      const timeRemaining = result && typeof result === 'object' ? result.remainingTime : 0;

      if (isSuccess) {
        setPin("");
        onConfirm(); 
      } else {
        setError(isLocked ? "Too many attempts. System Locked." : "Invalid Security PIN");
        setPin("");
        if (isLocked) setLockout({ isLocked: true, remaining: timeRemaining });
      }
    } catch (err) {
      console.error("[PIN_Verification_Error]:", err);
      setError("Security Gateway Error. Try again.");
    }
  }, [pin, lockout.isLocked, isProcessing, verifyPINAtSource, onConfirm]);

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
          variants={{ error: SHAKE_ANIMATION }}
          className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center relative border border-slate-100"
        >
          <button 
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close security modal"
            className="absolute top-6 right-6 p-2 rounded-full text-slate-300 hover:text-text-dark/80 hover:bg-slate-50 transition-all focus:ring-2 focus:ring-slate-200 outline-none"
          >
            <IconClose className="w-4 h-4" />
          </button>

          {/* Security Icon */}
          <div 
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
              lockout.isLocked ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-text-dark'
            }`}
          >
            <IconLock className="w-6 h-6" aria-hidden="true" />
          </div>

          <h3 id="pin-modal-title" className="text-xl font-bold text-slate-800">
            Security Verification
          </h3>
          <p className="text-sm-text text-text-dark/80 mt-2 mb-8">
            Please enter PIN to authorize <br />
            <span className="text-rose-500 font-semibold">{title}</span>
          </p>

          {lockout.isLocked ? (
            <div role="alert" className="p-4 rounded-2xl  mb-6">
              <p className="text-micro font-bold text-rose-600 uppercase tracking-widest">Locked Out</p>
              <p className="text-sm-text text-rose-500 mt-1">Try again in {lockout.remaining} minutes.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
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
                  className={`w-full text-center text-3xl font-bold tracking-[0.5em] py-4 bg-slate-50 border-2 rounded-2xl transition-all outline-none focus:ring-4 ${
                    error 
                      ? 'border-rose-400 text-rose-600 focus:ring-rose-100' 
                      : 'border-slate-100 focus:border-slate-800 focus:ring-slate-100'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="••••••"
                  aria-label="6 digit security pin"
                  aria-invalid={!!error}
                />
              </div>

              {/* Error Region: Polished for screen readers */}
              <div className="" aria-live="assertive">
                {error && <p className="text-micro font-bold text-rose-500 uppercase tracking-wider">{error}</p>}
              </div>

              <div className="flex flex-row gap-3">
                <Button
                  variant="danger"
                  type="submit"
                  className="flex-1 "
                  disabled={pin.length < PIN_LENGTH || isProcessing}
                  isLoading={isProcessing}
                >
                  Authorize Action
                </Button>

                <Button
                  variant="secondary"
                  type="button"
                  className="flex-1 "
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}