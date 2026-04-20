/**
 * @file RecentActivity.jsx
 * @description Enterprise-grade Recent Activity feed with Server-Side Date Filtering.
 * @security Implements strict input sanitization, Date validation, and AbortControllers.
 */

import { useEffect, useState, useCallback, memo,  useMemo, useRef } from "react";
import { useActivityStore } from '../../store/activities/useActivityStore';
import { IconActivity, IconLoading, IconClose, IconInfo } from "../icons";
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// 🛡️ UTILITIES & SANITIZATION
// ==========================================

/**
 * Strips dangerous characters and truncates to prevent UI breaking or DOM-based XSS.
 */
const sanitizeText = (text, fallback = "Unknown", maxLength = 60) => {
  if (typeof text !== 'string' || !text.trim()) return fallback;
  const clean = text.replace(/[<>]/g, '').trim(); 
  return clean.length > maxLength ? `${clean.substring(0, maxLength)}...` : clean;
};

/**
 * Defensively parses dates. Prevents "NaNd ago" or crashing the JS thread.
 */
const formatTimeAgo = (dateInput) => {
  if (!dateInput) return 'Unknown time';
  
  const date = new Date(dateInput);
  const now = new Date();
  
  if (isNaN(date.getTime())) return 'Unknown time';
  if (date > now) return 'Just now'; 

  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  
  // For older dates, a standard date format is more useful than "45d ago"
  if (diff > 86400 * 7) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  return `${Math.floor(diff / 86400)}d ago`;
};

/**
 * Strictly validates YYYY-MM-DD to prevent backend injection attacks.
 */
const isValidDateString = (dateStr) => {
  if (!dateStr) return true; // Empty string means "All Time/Latest"
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateStr.match(regEx)) return false;
  const d = new Date(dateStr);
  return d.getTime() && d.toISOString().slice(0, 10) === dateStr;
};

// ==========================================
// ⚛️ ATOMIC COMPONENTS
// ==========================================

const TimeAgo = memo(({ timestamp }) => {
  return <time dateTime={timestamp} className="whitespace-nowrap">{formatTimeAgo(timestamp)}</time>;
});
TimeAgo.displayName = "TimeAgo";

const ActivityItem = memo(({ item, tick }) => {
  if (!item || !item.activity_id) return null;

  const title = item.actionType === 'system_update' 
    ? item.customLabel 
    : item.actionType === 'created' 
      ? "Order Created" 
      : item.customLabel || "Status Updated";

  const cleanTitle = sanitizeText(title, "Activity Logged", 50);
  const cleanCustomer = sanitizeText(item.customer_name, "System", 30);
  const cleanOrderRef = sanitizeText(item.order_number, "LOG", 20);

  return (
    <li className="group border-l-2 border-slate-100 pl-4 hover:border-app-dark/20 transition-colors focus-within:border-app-dark/40">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-x-2">
          <p className="text-sm-text text-text-dark capitalize truncate ">
            {cleanTitle}
          </p>
          <p className="text-nano text-text-dark/50 shrink-0" aria-live="polite">
            <TimeAgo timestamp={item.timestamp} tick={tick} />
          </p>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <p className="text-nano text-text-dark/70 uppercase truncate">
            {cleanCustomer}
          </p>
          <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
          <p className="text-nano font-bold text-text-dark/80 shrink-0">
            {cleanOrderRef !== "SETTINGS" && "#"}{cleanOrderRef}
          </p>
        </div>
      </div>
    </li>
  );
});
ActivityItem.displayName = "ActivityItem";

// ==========================================
// 🚀 MAIN COMPONENT
// ==========================================

export default function RecentActivity() {
  const [selectedDate, setSelectedDate] = useState("");
  const [tick, setTick] = useState(0);

  // Zustand Store Selectors
  const activities = useActivityStore((state) => state.activities || []);
  const isFetching = useActivityStore((state) => state.isFetching);
  const hasMore = useActivityStore((state) => state.hasMore);
  const error = useActivityStore((state) => state.error); 
  const fetchActivities = useActivityStore((state) => state.fetchActivities);

  // Get Today's Date dynamically for the max attribute (prevents selecting future dates)
  const maxDate = useMemo(() => new Date().toISOString().split("T")[0], []);
const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);

  // 🛡️ QA RESILIENCE: Server-Side Fetching Trigger with Abort Controller
  useEffect(() => {
    const abortController = new AbortController();
    
    // Pass the specific date filter to the backend logic via the store
    if (typeof fetchActivities === 'function') {
      fetchActivities({ date: selectedDate, loadMore: false }, abortController.signal)
        .catch(err => {
          if (!abortController.signal.aborted) console.error("[ActivityFeed] Date fetch failed", err);
        });
    }

    return () => abortController.abort();
  }, [selectedDate, fetchActivities]);

  // UI Tick for "Time Ago" relative updates
  useEffect(() => {
    const intervalId = setInterval(() => setTick((t) => (t + 1) % 10000), 60000); 
    return () => clearInterval(intervalId);
  }, []);

  // --- HANDLERS ---
  const handleDateChange = useCallback((e) => {
    const val = e.target.value;
    if (isValidDateString(val)) {
      setSelectedDate(val);
    }
  }, []);

  const handleClearDate = useCallback(() => {
    setSelectedDate("");
  }, []);

   useEffect(() => {
      const handleClickOutside = (e) => {
        if (infoRef.current && !infoRef.current.contains(e.target)) setShowInfo(false);
      };
      document.addEventListener("pointerdown", handleClickOutside);
      return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, []);

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore && typeof fetchActivities === 'function') {
      // Important: Retain the selected date when paginating older logs
      fetchActivities({ date: selectedDate, loadMore: true })
        .catch((err) => console.error("[ActivityFeed] Pagination failed", err));
    }
  }, [isFetching, hasMore, fetchActivities, selectedDate]);

 return (
  <section 
    className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 flex flex-col max-h-[350px] min-h-[250px] overflow-hidden"
    aria-labelledby="recent-activity-heading"
  >
    <div className="p-5 flex-1 flex flex-col overflow-hidden">
      
      {/* --- HEADER --- */}
      <header className="flex justify-between items-start gap-1 mb-4 shrink-0">
        
        {/* LEFT: Title & Options */}
        <div className="min-w-0 flex-1 relative">
                <div className="flex items-center gap-2 mb-1 " ref={infoRef}>
            <h2 id="recent-activity-heading" className="text-sm-text font-bold text-text-dark/70 truncate uppercase tracking-tight">
              System Logs
            </h2>
            <button onClick={() => setShowInfo(!showInfo)} className="text-text-dark/30 hover:text-app-dark focus:outline-none focus-visible:ring-2 rounded-full">
                             <IconInfo className="w-4 h-4" />
                          </button>
                          
                          <AnimatePresence>
                            {showInfo && (
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute left-0 top-7 w-72 p-4 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]">
                                
                                {/* ✨ REFACTORED INFO PANEL */}
                                <div className="space-y-3">
                                  <p className="text-sm-text text-text-dark/90 leading-relaxed font-normal">
                                  This serves as a real-time audit trail to monitor shop operations and system events. It provides a historical record of shop activity
                                   </p>
                                  
                                </div>
            
                              </motion.div>
                            )}
                          </AnimatePresence>
          </div>

          {/* OPTIONS (Below Title) */}
          <div className="relative mt-2 flex items-center gap-1.5 z-10">
            <input 
              type="date" 
              value={selectedDate}
              onChange={handleDateChange}
              max={maxDate}
              aria-label="Filter activities by date"
              className="text-sm-text  text-text-dark text-left bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/20 hover:bg-slate-50 transition-all cursor-pointer w-max"
            />
            
            <AnimatePresence>
              {selectedDate && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClearDate}
                  aria-label="Clear date filter"
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <IconClose className="w-4 h-4" aria-hidden="true" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT: Icon Block */}
        <div className="p-2.5 rounded-lg border border-app-dark/10 shadow-hollow shrink-0 bg-slate-50" aria-hidden="true">
          <IconActivity className="w-5 h-5 text-text-dark stroke-text-dark" />
        </div>
        
      </header>

      {/* --- BODY / FEED --- */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar" aria-live="polite" aria-busy={isFetching}>
        
        {/* Unhappy Path: Error State */}
        {error && !isFetching ? (
          <div className="h-full flex flex-col items-center justify-center opacity-70">
            <p className="text-sm-text text-rose-600  ">Failed to load logs.</p>
            <button onClick={() => fetchActivities({ date: selectedDate, loadMore: false })} className="mt-2 text-nano font-bold underline text-app-dark hover:text-blue-600">
              Retry Connection
            </button>
          </div>
        ) : activities.length > 0 ? (
          <ul className="space-y-4" aria-label="Activity List">
            {activities.map((item) => (
               <ActivityItem key={item?.activity_id || Math.random()} item={item} tick={tick} />
            ))}

            {hasMore && (
              <li className="pt-2 pb-2 list-none">
                <button
                  disabled={isFetching}
                  onClick={handleLoadMore}
                  aria-label="Load older activities"
                  className="w-full py-2.5 text-micro font-bold text-text-dark/60 hover:text-text-dark/90 bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-slate-50 disabled:hover:border-transparent focus:outline-none focus:ring-2 focus:ring-app-dark/20"
                >
                  {isFetching ? (
                    <>
                      <IconLoading className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Fetching Logs...</span>
                    </>
                  ) : (
                    "Load More Logs"
                  )}
                </button>
              </li>
            )}
          </ul>
        ) : (
          /* Unhappy Path: Empty/Loading State */
          <div className="h-full flex flex-col items-center justify-center py-10 opacity-50">
            <IconActivity className="w-8 h-8 text-slate-400 mb-2" aria-hidden="true" />
            <p className="text-sm-text text-text-dark font-bold">
              {isFetching ? "Retrieving history..." : selectedDate ? "No logs for this date" : "No recent activity"}
            </p>
          </div>
        )}
      </div>
      
    </div>
  </section>
);
}