import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { isSameDay, subDays } from 'date-fns'; // ✨ Added subDays
import { IconLock, IconClock, IconClose } from '../icons';

export default function StoreGuard({ children }) {
  const { systemConfig } = useSettingsStore();
  const [isLocked, setIsLocked] = useState(false);
  
  // ✨ Smarter Warning State
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);

  const formatTo12Hr = (timeStr) => {
    if (!timeStr) return "--:--";
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    const checkTime = () => {
      const config = systemConfig?.operatingHours;
      if (!config || config.isEnabled === false || !config.allowedDays?.length) {
        setIsLocked(false);
        return;
      }

      const { allowedDays, openTime = "08:00", closeTime = "22:00" } = config;
      const now = new Date();
      
      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);
      
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const openMins = openH * 60 + openM;
      const closeMins = closeH * 60 + closeM;

      // ✨ WHAT IF 1: Does the shift cross midnight? (e.g., 22:00 to 06:00)
      const crossesMidnight = closeMins <= openMins;

      // ✨ WHAT IF 2: Overnight allowed days logic
      let isAllowedDay = allowedDays.some(d => isSameDay(new Date(d), now));
      
      if (crossesMidnight && currentMins < closeMins) {
        // It is past midnight on an overnight shift. 
        // We must check if YESTERDAY was an allowed day.
        const yesterday = subDays(now, 1);
        isAllowedDay = allowedDays.some(d => isSameDay(new Date(d), yesterday));
      }

      if (!isAllowedDay) {
        setIsLocked(true);
        return;
      }

      let currentlyLocked = false;
      let minsRemaining = 0;

      // ✨ CALCULATING TIME REMAINING AND LOCK STATUS
      if (!crossesMidnight) {
        // Normal Shift (e.g., 08:00 to 22:00)
        currentlyLocked = currentMins < openMins || currentMins >= closeMins;
        if (!currentlyLocked) minsRemaining = closeMins - currentMins;
      } else {
        // Overnight Shift (e.g., 22:00 to 06:00)
        const isBeforeMidnight = currentMins >= openMins;
        const isAfterMidnight = currentMins < closeMins;
        currentlyLocked = !isBeforeMidnight && !isAfterMidnight;
        
        if (!currentlyLocked) {
          minsRemaining = isBeforeMidnight 
            ? (1440 - currentMins) + closeMins 
            : closeMins - currentMins;
        }
      }

      setIsLocked(currentlyLocked);

      if (!currentlyLocked) {
        setMinutesLeft(minsRemaining); // Acts as a live countdown if left open

        // Read the memory from the browser (0 = none, 1 = 30min sent, 2 = 5min sent)
        const savedLevel = parseInt(sessionStorage.getItem('lolafe_warning_level') || '0', 10);

        if (minsRemaining <= 5 && minsRemaining > 0 && savedLevel < 2) {
          // Critical 5-minute warning
          setShowWarningPopup(true);
          
          sessionStorage.setItem('lolafe_warning_level', '2'); // Memorize it!
        } 
        else if (minsRemaining <= 30 && minsRemaining > 5 && savedLevel < 1) {
          // Standard 30-minute warning
          setShowWarningPopup(true);
         
          sessionStorage.setItem('lolafe_warning_level', '1'); // Memorize it!
        } 
        else if (minsRemaining > 30 && savedLevel !== 0) {
          // Clean up the memory if hours are extended or a new day starts
          sessionStorage.setItem('lolafe_warning_level', '0');
        }
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 10000); 
    return () => clearInterval(interval);
  }, [systemConfig]);

  if (isLocked) {
    const { openTime, closeTime } = systemConfig?.operatingHours || {};
    
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center max-h-[100vh] p-6 text-center bg-app-light"
        >
          {/* ICON SECTION */}
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-slate-100 shadow-xl shadow-slate-200/50">
              <IconLock className="w-10 h-10 text-slate-400" />
            </div>
          </div>
          
          {/* TEXT SECTION */}
          <div className="max-w-sm space-y-4">
            <div>
              <h2 className="text-h1 font-bold text-text-dark tracking-tight mb-2">System Paused</h2>
              <p className="text-base-text font-medium text-text-dark/70 ">Operating Hours Restricted</p>
            </div>
            
            <div className="p-6 bg-white rounded-[2rem] border border-slate-100 space-y-4 shadow-sm">
              <p className="text-sm-text text-text-dark/70 leading-relaxed">
                To maintain shop security, system access is only available during your scheduled shift.
              </p>
              
              <div className="flex flex-col items-center gap-2">
                <span className="text-micro  text-text-dark/50">Today's Window</span>
                <div className="px-6 py-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-sm-text font-bold text-text-dark">
                  {formatTo12Hr(openTime)} — {formatTo12Hr(closeTime)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <button 
              onClick={() => window.location.reload()}
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

  // Determine dynamic styling based on urgency
  const isCritical = minutesLeft <= 5;

  return (
    <>
      {children}

      {/* ⚠️ SMART WARNING POPUP */}
      <AnimatePresence>
        {showWarningPopup && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-app-dark/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden border ${isCritical ? 'border-rose-300' : 'border-0'}`}
            >
              {/* Dynamic Top Accent Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${isCritical ? 'bg-rose-500' : 'bg-app-dark'}`} />
              
              <button 
                onClick={() => setShowWarningPopup(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-50 transition-colors"
              >
                <IconClose className="w-5 h-5 text-slate-400" />
              </button>

              <div className="text-center mt-2 mb-6">
                <div className={`w-16 h-16 text-text-dark rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-sm animate-pulse ${isCritical ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-amber-50 border-amber-100'}`}>
                  <IconClock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-text-dark uppercase tracking-tight">
                  {isCritical ? 'Locking Imminently' : 'Store Closing Soon'}
                </h3>
                <p className={`text-sm font-medium mt-1 ${isCritical ? 'text-rose-600 font-bold' : 'text-amber-600'}`}>
                  System locks in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 mb-6">
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  {isCritical 
                    ? "Immediate action required. Please finish your active transactions and print receipts now."
                    : "Please finalize all active transactions, print necessary receipts, and wrap up your shifts."}
                </p>
              </div>

              <button 
                onClick={() => setShowWarningPopup(false)}
                className={`w-full py-3.5 text-white font-medium rounded-xl transition-colors active:scale-[0.98] ${isCritical ? 'bg-rose-500 hover:bg-rose-600' : 'bg-app-dark hover:bg-app-dark/90 text-base-text'}`}
              >
                I Understand
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}