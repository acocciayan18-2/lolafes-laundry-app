import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { IconLock, IconTrash } from '../icons'; 
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';

const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export default function SettingsPINLock({ onUnlock, existingPIN }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [visibleIndex, setVisibleIndex] = useState(-1);

  const inputRef = useRef(null);
  const { updateSystemConfig } = useSettingsStore();
  const showNotification = useNotificationStore(state => state.showNotification);
  const isSetupMode = !existingPIN;

  // 🛡️ QA & UX: Auto-focus & Global Keyboard Interceptor
  useEffect(() => {
    const enforceFocus = (e) => {
      if ((/^\d$/.test(e.key) || e.key === 'Backspace') && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };

    if (lockoutTime === 0) {
      setTimeout(() => inputRef.current?.focus(), 100);
      window.addEventListener('keydown', enforceFocus);
    }
    
    return () => window.removeEventListener('keydown', enforceFocus);
  }, [lockoutTime]);

  // ✨ UX: Handle the "Preview then Hide" logic
  useEffect(() => {
    if (pin.length > 0) {
      setVisibleIndex(pin.length - 1);
      const timer = setTimeout(() => setVisibleIndex(-1), 500);
      return () => clearTimeout(timer);
    } else {
      setVisibleIndex(-1);
    }
  }, [pin]);

  // Lockout Logic
  useEffect(() => {
    const savedLockout = localStorage.getItem('pin_lockout_until');
    if (savedLockout) {
      const remaining = Math.ceil((parseInt(savedLockout) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutTime(remaining);
        setAttempts(MAX_ATTEMPTS); 
      } else {
        localStorage.removeItem('pin_lockout_until');
      }
    }
  }, []);

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => setLockoutTime(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (attempts >= MAX_ATTEMPTS) {
      setAttempts(0);
      localStorage.removeItem('pin_lockout_until');
    }
  }, [lockoutTime, attempts]);

  const processSubmit = useCallback(async (currentPin) => {
    if (lockoutTime > 0) return;

    if (isSetupMode) {
      await updateSystemConfig({ ownerPIN: currentPin });
      showNotification("PIN Set!", "success");
      onUnlock();
    } else {
      if (currentPin === existingPIN) {
        setAttempts(0);
        localStorage.removeItem('pin_lockout_until');
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(true);
        setPin(""); // Clear immediately so they can try again

        if (newAttempts >= MAX_ATTEMPTS) {
          const unlockAt = Date.now() + (LOCKOUT_SECONDS * 1000);
          localStorage.setItem('pin_lockout_until', unlockAt.toString());
          setLockoutTime(LOCKOUT_SECONDS);
          showNotification(`Locked for ${LOCKOUT_SECONDS}s.`, "error");
        } else {
          showNotification(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts left.`, "error");
        }
      }
    }
  }, [lockoutTime, isSetupMode, existingPIN, attempts, updateSystemConfig, showNotification, onUnlock]);

  const handleInputLogic = useCallback((newPin) => {
    if (lockoutTime > 0 || newPin.length > PIN_LENGTH) return;
    
    setPin(newPin);
    setError(false);

    if (newPin.length === PIN_LENGTH) {
      processSubmit(newPin);
    }
  }, [lockoutTime, processSubmit]);

  const handleKeyboardChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); 
    handleInputLogic(value);
  };

  const handleNumpadPress = useCallback((digit) => {
    if (pin.length < PIN_LENGTH) {
      handleInputLogic(pin + digit);
    }
  }, [pin, handleInputLogic]);

  const handleBackspace = useCallback(() => {
    if (pin.length > 0 && lockoutTime === 0) {
      handleInputLogic(pin.slice(0, -1));
    }
  }, [pin, lockoutTime, handleInputLogic]);

  const handleClearAll = () => {
    if (lockoutTime > 0) return;
    setPin("");
    setError(false);
  };

  const isLockedOut = lockoutTime > 0;

  return (
    <div className="flex items-center justify-center py-10">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="w-full  bg-app-light rounded-[2rem] p-8 text-center relative"
      >
        {isSetupMode && pin.length > 0 && !isLockedOut && (
          <button 
            onClick={handleClearAll}
            className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all focus:outline-none"
            title="Clear PIN"
          >
            <IconTrash className="w-4 h-4" />
          </button>
        )}

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${isLockedOut ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
          <IconLock className={`w-6 h-6 ${isSetupMode ? 'text-emerald-600' : ''}`} aria-hidden="true" />
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-1">
          {isLockedOut ? "Access Locked" : isSetupMode ? "Setup Security PIN" : "Security Verification"}
        </h3>
        
        <p className="text-sm-text text-slate-500 mb-6">
          {isLockedOut ? `Try again in ${lockoutTime} seconds` : isSetupMode ? "Create a 6-digit access code" : "Please enter your 6-digit PIN"}
        </p>

        {/* ✨ FIX: Wrapped in a <form> to eliminate browser warnings */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          
          {/* ✨ A11Y VISUAL PIN DISPLAY */}
          <motion.div 
            animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
            className="relative flex justify-center gap-2 sm:gap-3 cursor-text" 
            onClick={() => inputRef.current?.focus()}
           
          >
            {/* Hidden Native Input */}
            <input
              ref={inputRef}
              type="password" 
              inputMode="numeric"
              autoComplete="off"
              maxLength={PIN_LENGTH}
              value={pin}
              onChange={handleKeyboardChange}
              onCopy={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              disabled={isLockedOut}
              className="absolute inset-0 w-full h-full opacity-0 z-[-1]"
              aria-label={`${PIN_LENGTH} digit security pin`}
              aria-invalid={!!error}
            />

            {Array.from({ length: PIN_LENGTH }).map((_, i) => {
              const isFilled = i < pin.length;
              const isCurrentlyVisible = i === visibleIndex;
              const char = pin[i];

              return (
                <div
                  key={i}
                   className={`w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-2xl font-bold rounded-xl border transition-all ${
                       error 
                      ? 'border-rose-400 bg-rose-50 text-rose-600' 
                      : isFilled 
                        ? 'border-slate-800 bg-white text-slate-800 shadow-sm' 
                        : 'border-slate-200 bg-slate-50'
                  } ${isLockedOut ? 'opacity-50' : ''}`}
                >
                  {isFilled ? (isCurrentlyVisible ? char : '•') : ''}
                </div>
              );
            })}
          </motion.div>

          {/* ✨ ON-SCREEN NUMPAD */}
          <div className={`grid grid-cols-3 gap-1 max-w-[260px] mx-auto pb-1 transition-opacity ${isLockedOut ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                disabled={isLockedOut}
                onClick={() => handleNumpadPress(num.toString())}
                className="h-14 bg-slate-50 border hover:bg-slate-100 active:bg-slate-200 text-xl font-bold text-slate-800 rounded-2xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {num}
              </button>
            ))}
            
            <div />

            <button
              type="button"
              disabled={isLockedOut}
              onClick={() => handleNumpadPress("0")}
              className="h-14 bg-slate-50 border hover:bg-slate-100 active:bg-slate-200 text-xl font-bold text-slate-800 rounded-2xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              0
            </button>

            <button
              type="button"
              disabled={isLockedOut || pin.length === 0}
              onClick={handleBackspace}
              aria-label="Delete last digit"
              className="h-14 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 flex items-center justify-center rounded-2xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
              </svg>
            </button>
          </div>
        </form>

        {isSetupMode && <p className="text-micro text-amber-600 font-bold bg-amber-50 py-2 rounded-lg mt-4 border border-amber-100/50">Do not forget this PIN</p>}
      </motion.div>
    </div>
  );
}