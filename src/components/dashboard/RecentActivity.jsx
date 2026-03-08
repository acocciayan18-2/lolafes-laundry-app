import { useEffect, useState, useCallback } from "react";
import { useActivityStore } from '../../store/activities/useActivityStore';
import { IconActivity, IconLoading } from "../icons"; // ✨ Ensure IconLoading is imported

const formatTimeAgo = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function RecentActivity() {
  // ✨ Pull the new optimized functions from the store
  const { 
    activities, 
    isFetching, 
    hasMore, 
    fetchActivities, 
    clearHistory, 
    cleanupExpiredActivities 
  } = useActivityStore();

  const [, setTick] = useState(0);

  // 1. Initial Data Fetch
  useEffect(() => {
    cleanupExpiredActivities();
    // Only fetch if we don't already have activities (persisted state)
    if (activities.length === 0) {
      fetchActivities();
    }
  }, [cleanupExpiredActivities, fetchActivities]);

  // 2. Refresh "Time Ago" every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000); 
    return () => clearInterval(interval);
  }, []);

  const getActivityTitle = useCallback((item) => {
    if (!item) return "Update Logged";
    if (item.actionType === 'created') return "Order Created";
    return item.customLabel || "Status Updated";
  }, []);

  return (
    <div className="bg-white rounded-2xl border pb-3 border-app-dark/10 shadow-sm flex flex-col max-h-[450px] min-h-[300px] overflow-hidden">
      
      {/* HEADER */}
      <div className="px-5 py-3.5 border-b border-app-dark/5 flex justify-between items-center bg-white shrink-0">
        <div className="flex items-center gap-3 pl-2">
           <div className="p-1.5 bg-white border border-app-dark/10 rounded-lg text-text-dark shadow-hollow">
            <IconActivity className="w-5 h-5" />
          </div>
          <h2 className="text-base-text font-bold text-text-dark">Recent Activity</h2>
        </div>

        {activities.length > 0 && (
          <button 
            onClick={clearHistory}
            className="text-micro text-text-dark/30 hover:text-rose-500 transition-colors px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* CONTENT: Displays all activities currently in the store */}
      <div className="flex-1 overflow-y-auto p-4 px-6 space-y-4 custom-scrollbar">
        {activities.length > 0 ? (
          <>
            {activities.map((item) => {
              const title = getActivityTitle(item);
              return (
                <div key={item.activity_id} className="group border-l-2 border-slate-100 pl-4 hover:border-app-dark/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-x-2">
                      <p className="text-sm-text text-text-dark capitalize font-medium truncate">
                        {title}
                      </p>
                      <p className="text-nano text-text-dark/40 font-medium whitespace-nowrap">
                        {formatTimeAgo(item.timestamp)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-nano text-text-dark/70 uppercase">
                        {item.customer_name || "System"}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                      <p className="text-nano font-bold text-text-dark/80">
                        #{item.order_number || "LOG"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ✨ LOAD MORE TRIGGER: Only visible if the database has more records */}
            {hasMore && (
              <div className="pt-2 pb-2">
                <button
                  disabled={isFetching}
                  onClick={() => fetchActivities(true)}
                  className="w-full py-1 text-micro font-medium  text-text-dark/40  hover:text-text-dark/70 transition-all flex items-center justify-center gap-2"
                >
                  {isFetching ? (
                    <>
                      <IconLoading className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching more...</span>
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
            <p className="text-sm-text text-text-dark font-medium uppercase tracking-widest">
              {isFetching ? "Retrieving history..." : "No Activity"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}