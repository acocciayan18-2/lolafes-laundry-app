import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconWifiOff, IconWifiOn } from './icons';

export const NetworkToast = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const failureCount = useRef(0);

  useEffect(() => {
    const checkConnection = async () => {
      // If the app is in the background, don't perform the check
      if (document.visibilityState === 'hidden') return;

      try {
        // ✨ FIX 1: Removed the unused "response =" assignment
        await fetch('https://www.google.com/favicon.ico', {
          mode: 'no-cors',
          cache: 'no-store',
          // Set a short timeout to prevent hanging
          signal: AbortSignal.timeout(3000) 
        });

        // SUCCESS: Reset failures
        failureCount.current = 0;
        
        if (!isOnline) {
          setIsOnline(true);
          setIsDismissed(false); // Reset dismissal on status change
          setShowBackOnline(true);
          setTimeout(() => setShowBackOnline(false), 3000);
        }
      } catch (error) {
        // FALSE POSITIVE PROTECTION: 
        // Only flag as offline if it fails twice in a row
        failureCount.current += 1;
        if (failureCount.current >= 2) {
          setIsOnline(false);
          setIsDismissed(false);
          setShowBackOnline(false);
        }
      }
    };

    // Listeners for browser events
    const handleStatusChange = () => {
      if (navigator.onLine) {
        // Give the mobile browser 1 second to actually re-establish 
        // radio connection before pinging
        setTimeout(checkConnection, 1000);
      } else {
        setIsOnline(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When user comes back to the app, wait 1.5s before checking
        // This prevents the "instant fail" while the phone is re-connecting to LTE/WiFi
        setTimeout(checkConnection, 1500);
      }
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(checkConnection, 10000); // Check every 10s instead of 5s to save battery

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [isOnline]);

  // ✨ FIX 2: Used '_' to indicate the first argument (event) is intentionally unused
  const handleDragEnd = (_, info) => {
    // If swiped more than 100 pixels to the right, dismiss
    if (info.offset.x > 100) {
      setIsDismissed(true);
    }
  };

  return (
    <div className="fixed top-4 right-1 z-[9999999999] flex flex-col gap-2 pointer-events-none w-full max-w-[280px] px-2">
      <AnimatePresence>
        {/* OFFLINE STATE */}
        {!isOnline && !isDismissed && (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            whileTap={{ scale: 0.98 }}
            className="bg-red-500 text-white p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-red-600 pointer-events-auto backdrop-blur-md"
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <IconWifiOff className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-none">Connection Lost</p>
              <p className="text-[10px] opacity-80 mt-1">Reconnecting</p>
            </div>
          </motion.div>
        )}

        {/* ONLINE STATE */}
        {isOnline && showBackOnline && !isDismissed && (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="bg-emerald-600 text-white p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700 pointer-events-auto backdrop-blur-md"
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <IconWifiOn className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-none">Back Online</p>
              <p className="text-[10px] opacity-80 mt-1">Restored successfully</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};