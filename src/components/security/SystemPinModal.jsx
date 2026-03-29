import { useRef, useEffect, useState, useCallback } from "react";
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
  const [visibleIndex, setVisibleIndex] = useState(-1);

  // 🛡️ QA & UX: Auto-focus & Global Keyboard Interceptor
  useEffect(() => {
    const enforceFocus = (e) => {
      // If user types a number or backspace, instantly grab focus before the keystroke registers
      if ((/^\d$/.test(e.key) || e.key === 'Backspace') && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };

    if (isOpen && !lockout.isLocked) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setPin(""); // Reset PIN on open for security
      setVisibleIndex(-1);
      
      // Listen for rogue keystrokes
      window.addEventListener('keydown', enforceFocus);
    }
    
    return () => {
      window.removeEventListener('keydown', enforceFocus);
    };
  }, [isOpen, lockout.isLocked, setPin]);

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
    if (isProcessing || lockout.isLocked || newPin.length > PIN_LENGTH) return;
    
    setPin(newPin);

    // ✨ AUTO-SUBMIT: Instantly verify when the final digit is entered
    if (newPin.length === PIN_LENGTH) {
      onSubmit(newPin);
    }
  }, [isProcessing, lockout.isLocked, PIN_LENGTH, setPin, onSubmit]);

  // Handler for Physical Keyboard
  const handleKeyboardChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); 
    handleInputLogic(value);
  };

  // Handler for On-Screen Numpad
  const handleNumpadPress = useCallback((digit) => {
    if (pin.length < PIN_LENGTH) {
      handleInputLogic(pin + digit);
    }
  }, [pin, PIN_LENGTH, handleInputLogic]);

  const handleBackspace = useCallback(() => {
    if (pin.length > 0 && !isProcessing) {
      handleInputLogic(pin.slice(0, -1));
    }
  }, [pin, isProcessing, handleInputLogic]);

  const handleFormSubmit = (e) => e.preventDefault();

  if (!isOpen) return null;

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
              disabled={isProcessing}
              aria-label="Close security modal"
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all focus:ring-2 focus:ring-slate-200 outline-none"
            >
              <IconClose className="w-4 h-4" />
            </button>
          )}

          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${lockout.isLocked ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
            <IconLock className="w-6 h-6" aria-hidden="true" />
          </div>

          <h3 id="pin-modal-title" className="text-xl font-bold text-slate-800">
            Security Verification
          </h3>
          <p className="text-sm-text text-slate-500 mt-2 mb-6">
            Please enter PIN to authorize <br />
            <span className="text-rose-500 font-semibold">{title}</span>
          </p>

          {lockout.isLocked ? (
            <div role="alert" className="bg-rose-50 p-4 rounded-2xl border border-rose-100 mb-6">
              <p className="text-micro font-bold text-rose-600 uppercase tracking-widest">Locked Out</p>
              <p className="text-sm-text text-rose-500 mt-1">Try again in {lockout.remaining} minutes.</p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              
              {/* ✨ A11Y VISUAL PIN DISPLAY */}
              <div 
                className="relative flex justify-center gap-2 sm:gap-3 cursor-text" 
                onClick={() => inputRef.current?.focus()}
                aria-hidden="true"
              >
                {/* 🛡️ SECURITY: Hidden Native Input with Clipboard Blocking */}
                <input
                  ref={inputRef}
                  type="password" // OS-level security against keyboard caching
                  inputMode="numeric"
                  autoComplete="off" // Prevents browser "save password" prompts
                  maxLength={PIN_LENGTH}
                  value={pin}
                  onChange={handleKeyboardChange}
                  onCopy={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  disabled={isProcessing}
                  className="absolute inset-0 w-full h-full opacity-0 z-[-1]"
                  aria-label={`${PIN_LENGTH} digit security pin`}
                  aria-invalid={!!error}
                />

                {/* Render the visual boxes */}
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
                      } ${isProcessing ? 'opacity-50' : ''}`}
                    >
                      {isFilled ? (isCurrentlyVisible ? char : '•') : ''}
                    </div>
                  );
                })}
              </div>

              {/* Error Region */}
              <div className="h-4" aria-live="assertive">
                {error && <p className="text-sm-text font-medium text-rose-500">{error}</p>}
              </div>

              {/* ✨ ON-SCREEN NUMPAD */}
              <div className="grid grid-cols-3 gap-1 max-w-[260px] mx-auto pb-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleNumpadPress(num.toString())}
                    className="h-14 bg-slate-50 hover:bg-slate-100 border active:bg-slate-200 text-xl font-bold text-slate-800 rounded-2xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {num}
                  </button>
                ))}
                
                <div />

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleNumpadPress("0")}
                  className="h-14 bg-slate-50 border hover:bg-slate-100 active:bg-slate-200 text-xl font-bold text-slate-800 rounded-2xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  0
                </button>

                <button
                  type="button"
                  disabled={isProcessing || pin.length === 0}
                  onClick={handleBackspace}
                  aria-label="Delete last digit"
                  className="h-14 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 flex items-center justify-center rounded-2xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                  disabled={isProcessing}
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