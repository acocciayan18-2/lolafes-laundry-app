import { useRef, useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconClose, IconLock } from "../icons";
import Button from "../ui/Button";

// ==========================================
// 🛡️ SECURITY ENGINE: Tamper-Resistant Storage
// ==========================================
const OBFUSCATED_KEY = "__sys_trk_id"; 

const getSecurityState = () => {
  try {
    const raw = localStorage.getItem(OBFUSCATED_KEY);
    if (!raw) return { strikes: 0, lockedUntil: null };
    
    // Decode the Base64 payload
    const decoded = JSON.parse(atob(raw));
    
    // If the lockout period has expired in the real world, clear the penalty box
    if (decoded.lockedUntil && Date.now() > decoded.lockedUntil) {
      localStorage.removeItem(OBFUSCATED_KEY);
      return { strikes: 0, lockedUntil: null };
    }
    return decoded;
  } catch (err) {
    // If a hacker tampers with the Base64 string and corrupts it, reset safely.
    return { strikes: 0, lockedUntil: null };
  }
};

const saveSecurityState = (strikes, lockedUntil) => {
  const payload = btoa(JSON.stringify({ strikes, lockedUntil }));
  localStorage.setItem(OBFUSCATED_KEY, payload);
};

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
  hideClose = false,
  // ✨ INVISIBLE CONFIGS: Local brute-force limits
  MAX_ATTEMPTS = 3,
  LOCKOUT_SECONDS = 300 
}) => {
  const inputRef = useRef(null);
  const [visibleIndex, setVisibleIndex] = useState(-1);

  // ✨ NEW INVISIBLE STATE: Frontend Rate Limiting
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [localLockoutUntil, setLocalLockoutUntil] = useState(null);
  const [localRemaining, setLocalRemaining] = useState(0);
  const [isThrottled, setIsThrottled] = useState(false);

  // 🛡️ QA DEFENSE 1: Sync Persistent State on Mount
  useEffect(() => {
    if (isOpen) {
      const persistedState = getSecurityState();
      setFailedAttempts(persistedState.strikes);
      setLocalLockoutUntil(persistedState.lockedUntil);
    }
  }, [isOpen]);

  // 🛡️ QA DEFENSE 2: The Strike Counter & Local Storage Save
  // Watches the 'error' prop. If the backend rejects the PIN, it logs a strike.
  const prevErrorRef = useRef(error);
  useEffect(() => {
    if (error && error !== prevErrorRef.current && isOpen) {
      setFailedAttempts(prev => {
        const nextStrikes = prev + 1;
        let nextLockout = localLockoutUntil;

        if (nextStrikes >= MAX_ATTEMPTS) {
          nextLockout = Date.now() + (LOCKOUT_SECONDS * 1000);
          setLocalLockoutUntil(nextLockout);
        }
        
        // Save to browser immediately to prevent refresh/close bypass
        saveSecurityState(nextStrikes, nextLockout);
        return nextStrikes;
      });
      setPin(""); // Force user to start over
    }
    prevErrorRef.current = error;
  }, [error, isOpen, MAX_ATTEMPTS, LOCKOUT_SECONDS, setPin, localLockoutUntil]);

  // ⏱️ QA DEFENSE 3: The Absolute Local Lockout Timer
  useEffect(() => {
    if (!localLockoutUntil) return;

    const tick = () => {
      const secondsLeft = Math.ceil((localLockoutUntil - Date.now()) / 1000);
      if (secondsLeft <= 0) {
        setLocalLockoutUntil(null);
        setFailedAttempts(0); // Forgive strikes after time served
        setLocalRemaining(0);
        saveSecurityState(0, null); // Clear from local storage
      } else {
        setLocalRemaining(secondsLeft);
      }
    };

    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [localLockoutUntil]);

  // Merge the Backend Lockout with our new Frontend Lockout
  const isEffectivelyLocked = lockout.isLocked || localLockoutUntil !== null;
  const isInputDisabled = isProcessing || isEffectivelyLocked || isThrottled;

  // 🛡️ QA & UX: Auto-focus & Global Keyboard Interceptor
  useEffect(() => {
    const enforceFocus = (e) => {
      if ((/^\d$/.test(e.key) || e.key === 'Backspace') && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };

    if (isOpen && !isEffectivelyLocked) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setPin(""); 
      setVisibleIndex(-1);
      
      window.addEventListener('keydown', enforceFocus);
    }
    
    return () => {
      window.removeEventListener('keydown', enforceFocus);
    };
  }, [isOpen, isEffectivelyLocked, setPin]);

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

  // --- HANDLERS ---
  const handleInputLogic = useCallback((newPin) => {
    if (isInputDisabled || newPin.length > PIN_LENGTH) return;
    
    setPin(newPin);

    // ✨ AUTO-SUBMIT WITH THROTTLE: Prevents double-firing the API
    if (newPin.length === PIN_LENGTH) {
      setIsThrottled(true);
      onSubmit(newPin);
      setTimeout(() => setIsThrottled(false), 500);
    }
  }, [isInputDisabled, PIN_LENGTH, setPin, onSubmit]);

  const handleKeyboardChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); 
    handleInputLogic(value);
  };

  const handleNumpadPress = useCallback((digit) => {
    if (pin.length < PIN_LENGTH) {
      handleInputLogic(pin + digit);
    }
  }, [pin, PIN_LENGTH, handleInputLogic]);

  const handleBackspace = useCallback(() => {
    if (pin.length > 0 && !isInputDisabled) {
      handleInputLogic(pin.slice(0, -1));
    }
  }, [pin, isInputDisabled, handleInputLogic]);

  const handleFormSubmit = (e) => e.preventDefault();

  if (!isOpen) return null;

  // Format local timer (e.g., 60s -> 1m 0s)
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-modal-title"
      >
        <div className="absolute inset-0 bg-app-light" onClick={!hideClose ? onClose : undefined} />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full  bg-app-light rounded-[2rem] p-8 text-center relative z-10 "
        >
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={isInputDisabled}
              aria-label="Close security modal"
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-text-dark hover:bg-slate-100 transition-all focus:ring-2 focus:ring-slate-200 outline-none disabled:opacity-50"
            >
              <IconClose className="w-4 h-4" />
            </button>
          )}

          {/* ✨ FIX: Uses your exact UI, just swaps `lockout.isLocked` to our new combined variable */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${isEffectivelyLocked ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-text-dark'}`}>
            <IconLock className="w-6 h-6" aria-hidden="true" />
          </div>

          <h3 id="pin-modal-title" className="text-xl font-bold text-slate-800">
            Security Verification
          </h3>
          <p className="text-sm-text text-text-dark/80 mt-2 mb-6">
            Please enter PIN to authorize <br />
            <span className="text-rose-500 font-semibold">{title}</span>
          </p>

          {/* ✨ FIX: Exact same UI you built, dynamically showing Backend OR Frontend time remaining */}
          {isEffectivelyLocked ? (
            <div role="alert" className="p-4 rounded-2xl  mb-6">
              <p className="text-micro font-bold text-rose-600 uppercase tracking-widest">Locked Out</p>
              <p className="text-sm-text text-rose-500 mt-1">
                Try again in {localLockoutUntil ? formatTime(localRemaining) : `${lockout.remaining} minutes`}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              
              <div 
                className="relative flex justify-center gap-2 sm:gap-3 cursor-text" 
                onClick={() => { if(!isInputDisabled) inputRef.current?.focus() }}
                aria-hidden="true"
              >
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
                  disabled={isInputDisabled}
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
                      } ${isInputDisabled ? 'opacity-50' : ''}`}
                    >
                      {isFilled ? (isCurrentlyVisible ? char : '•') : ''}
                    </div>
                  );
                })}
              </div>

              {/* Error Region */}
              <div className="h-4" aria-live="assertive">
                {error && (
                  <p className="text-sm-text font-medium text-rose-500">
                    {error} {failedAttempts > 0 && `(${MAX_ATTEMPTS - failedAttempts} tries left)`}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1 max-w-[260px] mx-auto pb-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isInputDisabled}
                    onClick={() => handleNumpadPress(num.toString())}
                    className="h-14 bg-slate-50 hover:bg-slate-100 border border-app-dark/20 active:bg-slate-200 text-xl font-bold text-slate-800 rounded-2xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {num}
                  </button>
                ))}
                
                <div />

                <button
                  type="button"
                  disabled={isInputDisabled}
                  onClick={() => handleNumpadPress("0")}
                  className="h-14 bg-slate-50 border hover:bg-slate-100 border-app-dark/20 active:bg-slate-200 text-xl font-bold text-slate-800 rounded-2xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  0
                </button>

                <button
                  type="button"
                  disabled={isInputDisabled || pin.length === 0}
                  onClick={handleBackspace}
                  aria-label="Delete last digit"
                  className="h-14 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-text-dark flex items-center justify-center rounded-2xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                </button>
              </div>

              {!hideClose && (
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={onClose}
                  disabled={isInputDisabled}
                >
                  Cancel
                </Button>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};