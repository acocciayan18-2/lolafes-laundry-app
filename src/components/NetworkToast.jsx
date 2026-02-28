import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconWifiOff, IconWifiOn } from './icons'; // Adjust path to your icons

export const NetworkToast = () => {
  const [isOnline, setIsOnline] = useState(true); // Default to true to prevent flash on load
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    // 1. The "Active" Check Function
    const checkConnection = async () => {
      try {
        // Try to fetch a tiny image from a reliable source (like Google or your own backend)
        // 'no-cors' mode is important to avoid CORS errors
        await fetch('https://www.google.com/favicon.ico', { 
          mode: 'no-cors', 
          cache: 'no-store' 
        });
        
        // If we were offline and now the fetch works, we are back online
        if (!isOnline) {
          setIsOnline(true);
          setShowBackOnline(true);
          setTimeout(() => setShowBackOnline(false), 3000);
        }
      } catch (error) {
        // If fetch fails, we are definitely offline
        setIsOnline(false);
        setShowBackOnline(false);
      }
    };

    // 2. Listeners for immediate browser events (Good for complete disconnects)
    const handleBrowserOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };
    
    const handleBrowserOnline = () => {
      // Even if browser says online, verify with a ping
      checkConnection();
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);

    // 3. Set up an interval to check every 5 seconds (Polling)
    // This catches "Connected to WiFi but no Internet" scenarios
    const intervalId = setInterval(checkConnection, 5000);

    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
      clearInterval(intervalId);
    };
  }, [isOnline]);

  return (
    <div className="fixed top-4 right-2 z-[99999999999999] flex flex-col gap-2 pointer-events-none w-full max-w-[250px] px-2 ">
      <AnimatePresence>
        {/* OFFLINE STATE - RED */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="bg-red-500 text-white p-2  rounded-xl shadow-sm flex items-center gap-3 border border-red-600 pointer-events-auto backdrop-blur-sm"
          >
            <div className="w-7 h-7   flex items-center justify-center shrink-0">
              <IconWifiOff className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 !mr-1">
              <p className="text-sm-text font-medium">No Internet Connection</p>
              <p className="text-[10px] opacity-90 ">Reconnecting...</p>
            </div>
          </motion.div>
        )}

        {/* ONLINE STATE - GREEN */}
        {isOnline && showBackOnline && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="bg-emerald-600 text-white p-2  rounded-xl shadow-sm flex items-center gap-3 border border-emerald-700 pointer-events-auto"
          >
            <div className="w-7 h-7  flex items-center justify-center shrink-0">
              <IconWifiOn className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 !mr-1">
              <p className="text-sm-text font-medium ">Back Online</p>
              <p className="text-[10px] opacity-90 ">Connection restored.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};