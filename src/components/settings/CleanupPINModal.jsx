import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconLock, IconClose } from '../icons';
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { SecurityController } from '../../classes/SecurityController';
import Button from '../ui/Button';

export default function CleanupPINModal({ isOpen, onClose, onConfirm, title, isProcessing }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [lockout, setLockout] = useState({ isLocked: false });
  const { systemConfig } = useSettingsStore();
  
  const security = useMemo(() => new SecurityController(5, 15), []);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      setLockout(security.getLockoutStatus());
    }
  }, [isOpen, security]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (lockout.isLocked) return;

    const isCorrect = security.verify(pin, systemConfig?.ownerPIN);

    if (isCorrect) {
      security.resetAttempts();
      onConfirm();
    } else {
      const isNowLocked = security.recordFailedAttempt();
      if (isNowLocked) {
        setLockout(security.getLockoutStatus());
        setError("Too many attempts. Locked.");
      } else {
        setError("Invalid Security PIN");
        setPin("");
      }
    }
  };

  const shakeVariants = {
    error: { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            variants={shakeVariants}
            className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 text-center relative"
          >
            {/* ✨ THE CLOSE BUTTON */}
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="absolute top-5 right-5 p-2 rounded-full text-text-dark/20 hover:text-text-dark/50 hover:bg-slate-50 transition-all disabled:opacity-0"
            >
              <IconClose className="w-5 h-5" />
            </button>

            {/* Security Header Icon */}
            <div className={`w-16 h-16 flex items-center justify-center mx-auto transition-colors `}>
              <IconLock className={`w-8 h-8 ${lockout.isLocked ? 'text-white' : 'text-text-dark/70'}`} />
            </div>

            <h3 className="text-lg font-bold text-text-dark">Enter PIN to Continue</h3>
            <p className="text-sm-text font-normal text-text-dark/70 mt-1 mb-6 px-2">
              Required for: <span className="text-rose-500 font-medium">{title}</span>
            </p>

            {lockout.isLocked ? (
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 mb-6">
                <p className="text-sm font-bold text-rose-600 uppercase">Security Lockout</p>
                <p className="text-sm-text font-medium text-rose-500/70 mt-1">Try again in {lockout.remaining} minutes.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <input
                    autoFocus
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      setError("");
                      setPin(e.target.value.replace(/\D/g, ''));
                    }}
                    className={`w-full text-center text-h1 font-bold tracking-[0.6em] py-4 bg-slate-50 border-2 rounded-2xl focus:outline-none  transition-all ${
                      error ? 'border-rose-500 text-rose-500' : 'border-slate-100 focus:border-app-dark'
                    }`}
                    placeholder="••••••"
                  />
                </div>

                {error && <p className="text-sm-text font-bold text-rose-500 uppercase tracking-widest animate-pulse">{error}</p>}

                <div className="flex gap-3 w-full">
                  <Button
                    variant="danger"
                    type="submit"
                    className="flex-1 order-1"
                    disabled={pin.length < 6} 
                    isLoading={isProcessing}
                  >
                    Confirm Delete
                  </Button>

                  <Button
                    variant="secondary"
                    className="flex-1 order-2"
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
      )}
    </AnimatePresence>
  );
}