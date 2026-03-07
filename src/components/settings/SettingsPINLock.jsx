import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IconX, IconCheckWhite, IconLock, IconTrash } from '../icons'; // Added IconTrash
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

  const { updateSystemConfig } = useSettingsStore();
  const showNotification = useNotificationStore(state => state.showNotification);
  const isSetupMode = !existingPIN;

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

  const handleKeyPress = (n) => {
    if (lockoutTime > 0) return;
    if (pin.length < PIN_LENGTH) {
      setPin(p => p + n);
      setError(false);
    }
  };

  const handleDelete = () => {
    if (lockoutTime > 0) return;
    setPin(p => p.slice(0, -1));
  };

  // ✨ NEW: Clear entire PIN logic
  const handleClearAll = () => {
    if (lockoutTime > 0) return;
    setPin("");
    setError(false);
  };

  const handleSubmit = async () => {
    if (lockoutTime > 0) return;

    if (isSetupMode) {
      if (pin.length < PIN_LENGTH) return;
      await updateSystemConfig({ ownerPIN: pin });
      showNotification("PIN Set!", "success");
      onUnlock();
    } else {
      if (pin === existingPIN) {
        setAttempts(0);
        localStorage.removeItem('pin_lockout_until');
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(true);
        setPin("");

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
  };

  const isLockedOut = lockoutTime > 0;

  return (
    <div className="flex items-center justify-center py-10">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-[320px] bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl text-center relative"
      >
        {/* ✨ CLEAR ALL BUTTON (Only shows in Setup Mode when typing) */}
        {isSetupMode && pin.length > 0 && !isLockedOut && (
          <button 
            onClick={handleClearAll}
            className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
            title="Clear PIN"
          >
            <IconTrash className="w-4 h-4" />
          </button>
        )}

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-colors ${isLockedOut ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
          <IconLock className={`w-7 h-7 ${isSetupMode ? 'text-emerald-500' : isLockedOut ? 'text-rose-500 animate-pulse' : 'text-text-dark/70'}`} />
        </div>

        <h2 className="text-xl font-bold text-text-dark mb-1">
          {isLockedOut ? "Access Locked" : isSetupMode ? "Setup 6-Digit PIN" : "Enter 6-Digit PIN"}
        </h2>
        
        <p className={`text-micro font-bold tracking-widest mb-6 ${isLockedOut ? 'text-rose-500' : 'text-text-dark/70'}`}>
          {isLockedOut ? `Try again in ${lockoutTime}s` : "Settings Access"}
        </p>

        <motion.div animate={error ? { x: [-5, 5, -5, 5, 0] } : {}} className="flex justify-center gap-3 mb-8">
          {[...Array(PIN_LENGTH)].map((_, i) => (
            <div 
              key={i} 
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                pin.length > i 
                  ? (error ? 'bg-rose-500 scale-110' : 'bg-text-dark scale-110') 
                  : (isLockedOut ? 'bg-rose-100' : 'bg-slate-100')
              }`} 
            />
          ))}
        </motion.div>

        <div className={`grid grid-cols-3 gap-2 mb-4 transition-opacity ${isLockedOut ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} onClick={() => handleKeyPress(n.toString())} disabled={isLockedOut} className="h-12 rounded-xl bg-slate-50 text-lg font-bold text-text-dark hover:bg-slate-100 active:scale-90 transition-all disabled:active:scale-100">
              {n}
            </button>
          ))}
          <button onClick={handleDelete} disabled={isLockedOut} className="h-12 flex items-center justify-center text-slate-300 hover:text-rose-500 disabled:hover:text-slate-300">
            <IconX className="w-5 h-5" />
          </button>
          <button onClick={() => handleKeyPress("0")} disabled={isLockedOut} className="h-12 rounded-xl bg-slate-50 text-lg font-bold text-text-dark hover:bg-slate-100 active:scale-90 transition-all disabled:active:scale-100">
            0
          </button>
          <button onClick={handleSubmit} disabled={pin.length < PIN_LENGTH || isLockedOut} className="h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center disabled:opacity-30 disabled:bg-slate-200 disabled:text-slate-400 active:scale-90 transition-all disabled:active:scale-100">
            <IconCheckWhite className="w-5 h-5" />
          </button>
        </div>

        {isSetupMode && <p className="text-[10px] text-amber-600 font-bold bg-amber-50 py-2 rounded-lg mt-2">Do not forget this PIN</p>}
      </motion.div>
    </div>
  );
}