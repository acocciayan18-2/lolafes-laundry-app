import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { isSameDay, subDays } from 'date-fns';
import { IconLock, IconClock, IconClose } from '../icons';

// 🛡️ SECURITY & STABILITY: Safe Storage Wrapper
const SafeStorage = {
  get: (key) => {
    try { return sessionStorage.getItem(key); } 
    catch (e) { return null; }
  },
  set: (key, value) => {
    try { sessionStorage.setItem(key, value); } 
    catch (e) { console.warn("Storage restricted."); }
  },
  remove: (key) => {
    try { sessionStorage.removeItem(key); } 
    catch (e) {}
  },
  clear: () => {
    try { sessionStorage.clear(); } 
    catch (e) {}
  }
};

export default function StoreGuard({ children }) {
  // 🛡️ Primitives only to prevent infinite re-renders
  const operatingHours = useSettingsStore(state => state.systemConfig?.operatingHours);
  const isEnabled = operatingHours?.isEnabled;
  const openTime = operatingHours?.openTime;
  const closeTime = operatingHours?.closeTime;
  const allowedDaysStr = JSON.stringify(operatingHours?.allowedDays || []);

  const [isLocked, setIsLocked] = useState(false);
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  
  const prevCloseTimeRef = useRef(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatTo12Hr = useCallback((timeStr) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return "--:--";
    try {
      const [hours, minutes] = timeStr.split(':');
      let h = parseInt(hours, 10);
      if (isNaN(h)) return "--:--";
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return "--:--";
    }
  }, []);

  // Wipes memory if the Owner explicitly changes the closing time
  useEffect(() => {
    if (prevCloseTimeRef.current && closeTime && prevCloseTimeRef.current !== closeTime) {
      SafeStorage.remove('warn_30');
      SafeStorage.remove('warn_5');
      setShowWarningPopup(false);
    }
    
    if (closeTime) {
      prevCloseTimeRef.current = closeTime;
    }
  }, [closeTime]);

  useEffect(() => {
    const checkTime = () => {
      if (isEnabled === false || !allowedDaysStr || allowedDaysStr === "[]") {
        setIsLocked(false);
        setShowWarningPopup(false);
        return;
      }

      const now = new Date();
      let allowedDays = [];
      try { allowedDays = JSON.parse(allowedDaysStr); } catch (e) {}
      
      const [openH, openM] = (openTime || "08:00").split(':').map(Number);
      const [closeH, closeM] = (closeTime || "22:00").split(':').map(Number);
      
      if (isNaN(openH) || isNaN(closeH)) return;

      const currentMins = now.getHours() * 60 + now.getMinutes();
      const openMins = openH * 60 + openM;
      const closeMins = closeH * 60 + closeM;

      const crossesMidnight = closeMins <= openMins;

      let isAllowedDay = allowedDays.some(d => isSameDay(new Date(d), now));
      
      if (crossesMidnight && currentMins < closeMins) {
        const yesterday = subDays(now, 1);
        isAllowedDay = allowedDays.some(d => isSameDay(new Date(d), yesterday));
      }

      if (!isAllowedDay) {
        setIsLocked(true);
        setShowWarningPopup(false);
        return;
      }

      let currentlyLocked = false;
      let minsRemaining = 0;

      if (!crossesMidnight) {
        currentlyLocked = currentMins < openMins || currentMins >= closeMins;
        if (!currentlyLocked) minsRemaining = closeMins - currentMins;
      } else {
        const isBeforeMidnight = currentMins >= openMins;
        const isAfterMidnight = currentMins < closeMins;
        currentlyLocked = !isBeforeMidnight && !isAfterMidnight;
        
        if (!currentlyLocked) {
          minsRemaining = isBeforeMidnight ? (1440 - currentMins) + closeMins : closeMins - currentMins;
        }
      }

      setIsLocked(currentlyLocked);

      // ✨ EXACT 2-WARNING LOGIC (30 mins & 5 mins)
      if (!currentlyLocked) {
        setMinutesLeft(minsRemaining); 

        // This handles the "Next Day" logic if they leave the tab open overnight
        if (minsRemaining > 30) {
          SafeStorage.remove('warn_30');
          SafeStorage.remove('warn_5');
          setShowWarningPopup(false);
        } else {
          // Warning 2: Critical 5 Minutes Left
          if (minsRemaining <= 5 && !SafeStorage.get('warn_5')) {
            SafeStorage.set('warn_5', 'true'); // Immediately mark as shown in memory
            setShowWarningPopup(true);
          } 
          // Warning 1: Standard 30 Minutes Left
          else if (minsRemaining <= 30 && minsRemaining > 5 && !SafeStorage.get('warn_30')) {
            SafeStorage.set('warn_30', 'true'); // Immediately mark as shown in memory
            setShowWarningPopup(true);
          }
        }
      } else {
        setShowWarningPopup(false);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 10000); 
    return () => clearInterval(interval);
  }, [isEnabled, openTime, closeTime, allowedDaysStr]);

  if (isLocked) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-[80vh] p-6 text-center bg-app-light rounded-3xl"
        >
          <div className="relative mb-2">
            <div className="w-24 h-24 flex items-center justify-center  ">
              <IconLock className="w-10 h-10 text-slate-400" />
            </div>
          </div>
          
          <div className="max-w-sm w-full space-y-4">
            <div>
              <h2 className="text-h1 font-bold text-text-dark tracking-tight mb-2">System Paused</h2>
              <p className="text-base-text  text-text-dark/70 ">Operating Hours Restricted</p>
            </div>
            
            <div className="p-6 bg-white rounded-[2rem] border border-slate-100 space-y-4 shadow-sm w-full">
              <p className="text-sm-text text-text-dark/70 leading-relaxed">
                To maintain shop security, system access is only available during your scheduled shift.
              </p>
              
              <div className="flex flex-col items-center gap-2">
                <span className="text-micro text-text-dark/50">Today's Window</span>
                <div className="px-6 py-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-sm-text font-bold text-text-dark">
                  {formatTo12Hr(openTime)} — {formatTo12Hr(closeTime)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <button 
              onClick={() => {
                SafeStorage.clear();
                window.location.reload();
              }}
              className="px-5 py-3 bg-app-dark text-white rounded-2xl text-sm-text font-normal shadow-md hover:bg-app-dark/90 active:scale-95 transition-all"
            >
              Refresh Connection
            </button>
            <p className="text-nano font-normal text-text-dark/40 italic">
              Contact the owner if this is an error
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const isCritical = minutesLeft <= 5;

  return (
    <div className="relative flex flex-col flex-1 w-full h-full min-h-full">
      {children}

      {isMounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showWarningPopup && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden border transition-colors duration-500 ${isCritical ? 'border-rose-300' : 'border-0'}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 transition-colors duration-500 ${isCritical ? 'bg-rose-500' : 'bg-app-dark'}`} />
                
                <button 
                  onClick={() => setShowWarningPopup(false)}
                  className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Dismiss warning"
                >
                  <IconClose className="w-5 h-5 text-slate-400" />
                </button>
                
                <div className="text-center mt-2 mb-6">
                  <div className={`w-16 h-16 flex items-center justify-center mx-auto mb-4 duration-500 ${isCritical ? ' text-rose-500 animate-pulse' : ' text-amber-500'}`}>
                    <IconClock className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-text-dark uppercase tracking-tight">
                    {isCritical ? 'Locking Imminently' : 'Store Closing Soon'}
                  </h3>
                  <p className={`text-sm-text  mt-1 ${isCritical ? 'text-rose-600 font-bold' : 'text-amber-600'}`}>
                    System locks in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 mb-6">
                  <p className="text-micro  text-slate-600 leading-relaxed">
                    {isCritical 
                      ? "Immediate action required. Please conclude all pending transactions and secure your current session now."
                      : "Please begin finalizing active operations, processing remaining transactions, and preparing for system closure."}
                  </p>
                </div>

                <button 
                  onClick={() => setShowWarningPopup(false)}
                  className={`w-full py-3.5 text-white font-normal rounded-xl transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCritical ? 'bg-rose-500 hover:bg-rose-600 focus:ring-rose-500/50' : 'bg-app-dark hover:bg-app-dark/90 text-base-text focus:ring-app-dark/50'}`}
                >
                  I Understand
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}