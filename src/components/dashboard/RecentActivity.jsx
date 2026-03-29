/**
 * @file RecentActivity.jsx
 * @description Enterprise-grade Recent Activity feed with virtualization-ready atomic components.
 * @security Implements strict input sanitization and defensive null-checking.
 */

import  { useEffect, useState, useCallback, memo, useRef } from "react";
import { useActivityStore } from '../../store/activities/useActivityStore';
import { IconActivity, IconLoading } from "../icons";

// ==========================================
// 🛡️ UTILITIES & SANITIZATION
// ==========================================

/**
 * Strips dangerous characters and truncates to prevent UI breaking or basic XSS.
 * *Note: True XSS prevention must also happen at the Backend API layer.*
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
  if (date > now) return 'Just now'; // Prevent negative time from clock drift

  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ==========================================
// ⚛️ ATOMIC COMPONENTS
// ==========================================

const TimeAgo = memo(({ timestamp }) => {
  return <time dateTime={timestamp}>{formatTimeAgo(timestamp)}</time>;
});
TimeAgo.displayName = "TimeAgo";

/**
 * Isolated list item to prevent O(n) re-renders. 
 * Only re-renders if its specific props change.
 */
const ActivityItem = memo(({ item, tick }) => {
  // Defensive return against corrupted arrays
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
          <p className="text-sm-text text-text-dark capitalize truncate font-medium">
            {cleanTitle}
          </p>
          <p className="text-nano text-text-dark/50 whitespace-nowrap" aria-live="polite">
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
  // Staff Eng Fix: Use atomic selectors to prevent unnecessary re-renders when other store data changes.
  const activities = useActivityStore((state) => state.activities || []);
  const isFetching = useActivityStore((state) => state.isFetching);
  const hasMore = useActivityStore((state) => state.hasMore);
  const error = useActivityStore((state) => state.error); // Added error resilience
  const fetchActivities = useActivityStore((state) => state.fetchActivities);

  const [tick, setTick] = useState(0);
  const hasFetched = useRef(false);

  // Safely trigger initial fetch without breaking React paradigms
  useEffect(() => {
    if (!hasFetched.current && activities.length === 0) {
      hasFetched.current = true;
      fetchActivities().catch((err) => console.error("[ActivityFeed] Init fetch failed", err));
    }
  }, [activities.length, fetchActivities]);

  // UI Tick for time updates (Cleaned up)
  useEffect(() => {
    const intervalId = setInterval(() => setTick((t) => (t + 1) % 10000), 60000); 
    return () => clearInterval(intervalId);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      fetchActivities(true).catch((err) => console.error("[ActivityFeed] Pagination failed", err));
    }
  }, [isFetching, hasMore, fetchActivities]);

  return (
    <section 
      className="bg-white rounded-2xl border pb-3 border-app-dark/10 shadow-sm flex flex-col max-h-[450px] min-h-[300px] overflow-hidden"
      aria-labelledby="recent-activity-heading"
    >
      {/* Header */}
      <header className="px-5 py-3.5 border-b border-app-dark/5 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-3 pl-2">
           <div className="p-1.5 bg-white border border-app-dark/10 rounded-lg text-text-dark shadow-hollow" aria-hidden="true">
            <IconActivity className="w-5 h-5" />
          </div>
          <h2 id="recent-activity-heading" className="text-base-text font-bold text-text-dark">
            Recent Activity
          </h2>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 px-6 custom-scrollbar">
        {/* Unhappy Path: Error State */}
        {error ? (
          <div className="h-full flex flex-col items-center justify-center opacity-70">
            <p className="text-sm-text text-rose-600 font-medium">Failed to load activities.</p>
            <button onClick={() => fetchActivities()} className="mt-2 text-nano underline text-app-dark">Retry</button>
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
                  className="w-full py-2 text-micro text-text-dark/60 hover:text-text-dark/90 hover:bg-slate-50 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-app-dark/20"
                >
                  {isFetching ? (
                    <>
                      <IconLoading className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </li>
            )}
          </ul>
        ) : (
          /* Unhappy Path: Empty/Loading State */
          <div className="h-full flex flex-col items-center justify-center py-20 opacity-40">
            <p className="text-sm-text text-text-dark" aria-live="polite">
              {isFetching ? "Retrieving history..." : "No Recent Activity"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}