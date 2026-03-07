import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { isSameDay } from 'date-fns';
import { IconLock } from '../icons';

export default function StoreGuard({ children }) {
  const { systemConfig } = useSettingsStore();
  const [isLocked, setIsLocked] = useState(false);

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
      
      if (!config || config.isEnabled === false) {
        setIsLocked(false);
        return;
      }

      const { allowedDays = [], openTime = "08:00", closeTime = "22:00" } = config;

      if (allowedDays.length === 0) {
        setIsLocked(false);
        return;
      }

      const now = new Date();
      const isTodayAllowed = allowedDays.some(dayStr => 
        isSameDay(new Date(dayStr), now)
      );

      if (!isTodayAllowed) {
        setIsLocked(true);
        return;
      }

      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);
      
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      const openTimeMinutes = openH * 60 + openM;
      const closeTimeMinutes = closeH * 60 + closeM;

      setIsLocked(currentTimeMinutes < openTimeMinutes || currentTimeMinutes > closeTimeMinutes);
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
          className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center"
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
              <h2 className="text-h1 font-bold text-text-dark  tracking-tight mb-2">System Paused</h2>
              <p className="text-base-text font-medium text-text-dark/70 ">Operating Hours Restricted</p>
            </div>
            
            <div className="p-6 bg-app-light rounded-[2rem] border border-slate-100 space-y-4">
              <p className="text-sm-text  text-text-dark/70 leading-relaxed">
                To maintain shop security, system access is only available during your scheduled shift.
              </p>
              
              <div className="flex flex-col items-center gap-2">
                <span className="text-micro text-text-dark/50 ">Today's Window</span>
                <div className="px-6 py-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 text-sm-text font-bold text-text-dark">
                  {formatTo12Hr(openTime)} — {formatTo12Hr(closeTime)}
                </div>
              </div>
            </div>
          </div>

          {/* ACTION SECTION */}
          <div className="mt-5 flex flex-col items-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-app-dark text-white rounded-2xl text-sm-text   shadow-md  hover:bg-app-dark/90 active:scale-95 transition-all"
            >
              Refresh Connection
            </button>
            <p className="text-[10px] text-text-dark/60 italic">
              *If you believe this is an error, contact the owner.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return children;
}