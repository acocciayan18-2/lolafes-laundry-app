<<<<<<< HEAD
import React from "react";
import { useActivityStore } from '../../store/activities/useActivityStore'; 
import { 
  IconNewOrder, 
  IconOrdersList,
  IconActivity,
  IconLoyalty,
  IconServices
} from "../icons"; 
=======
import { useEffect } from "react";
import { useActivityStore } from '../../store/activities/useActivityStore';
import {
  IconActivity,
  IconLoyalty,
  IconNewOrder,
  IconOrdersList,
  IconServices
} from "../icons";
>>>>>>> Karen2.0

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
<<<<<<< HEAD

 const activities = useActivityStore((state) => state.activities);
  const clearHistory = useActivityStore((state) => state.clearHistory);

  const getActivityConfig = (item) => {
  const defaultConfig = { 
    title: item?.customLabel || "Update Logged", 
    icon: <IconOrdersList className="w-5 h-5 text-text-dark/50" /> 
  };

  if (!item) return defaultConfig;

  // 1. STRICT PRIORITY: Only show "ORDER CREATED" for the explicit creation action
  if (item.actionType === 'created') {
    return { 
      title: "Order Created", 
      icon: <IconNewOrder className="w-5 h-5 text-text-dark" /> 
    };
  }

  // 2. Loyalty & Services (Keep your existing logic)
  if (item.customLabel?.toLowerCase().includes("loyalty") || item.order_number === "CONFIG") {
    return { title: item.customLabel, icon: <IconLoyalty className="w-5 h-5 text-text-dark" /> };
  }

  if (["SERVICE", "NEW", "EDITED"].includes(item.order_number)) {
    return { title: item.customLabel, icon: <IconServices className="w-5 h-5 text-text-dark" /> };
  }

  // 3. FALLBACK: Any other log that isn't a "creation"
  return { 
    title: item.customLabel || "Status Updated", 
    icon: <IconOrdersList className="w-5 h-5 text-text-dark/50" /> 
  };
};
  
=======
  const activities = useActivityStore((state) => state.activities);
  const isFetching = useActivityStore((state) => state.isFetching);
  const clearHistory = useActivityStore((state) => state.clearHistory);
  const cleanupExpiredActivities = useActivityStore((state) => state.cleanupExpiredActivities);
  const fetchActivitiesFromFirebase = useActivityStore((state) => state.fetchActivitiesFromFirebase);

  useEffect(() => {
    cleanupExpiredActivities();
  }, [cleanupExpiredActivities]);

  const getActivityConfig = (item) => {
    const defaultConfig = { 
      title: item?.customLabel || "Update Logged", 
      icon: <IconOrdersList className="w-5 h-5 text-text-dark/50" /> 
    };

    if (!item) return defaultConfig;
    if (item.actionType === 'created') {
      return { title: "Order Created", icon: <IconNewOrder className="w-5 h-5 text-text-dark" /> };
    }
    if (item.customLabel?.toLowerCase().includes("loyalty") || item.order_number === "CONFIG") {
      return { title: item.customLabel, icon: <IconLoyalty className="w-5 h-5 text-text-dark" /> };
    }
    if (["SERVICE", "NEW", "EDITED"].includes(item.order_number)) {
      return { title: item.customLabel, icon: <IconServices className="w-5 h-5 text-text-dark" /> };
    }

    return { title: item.customLabel || "Status Updated", icon: <IconOrdersList className="w-5 h-5 text-text-dark/50" /> };
  };
>>>>>>> Karen2.0

  return (
    <div className="bg-white rounded-2xl border border-app-dark/10 shadow-sm flex flex-col max-h-[450px] min-h-[300px] overflow-hidden">
      
      {/* HEADER */}
      <div className="px-5 py-3.5 border-b border-app-dark/5 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3 pl-5">
          <div className="p-1.5 bg-white border border-app-dark/10 rounded-lg text-text-dark shadow-hollow">
            <IconActivity className="w-5 h-5" />
          </div>
          <h2 className="text-base-text font-bold text-text-dark">Recent Activity</h2>
        </div>

<<<<<<< HEAD
        {activities.length > 0 && (
          <button 
            onClick={clearHistory}
            className="text-micro font-medium text-text-dark/40 hover:text-red-500  active:text-red-500 transition-colors px-2 py-1"
          >
            Clear All
=======
        {/* DYNAMIC BUTTON LOGIC */}
        {activities.length > 0 ? (
          <button 
            onClick={clearHistory}
            className="text-micro font-bold text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
          >
            Clear Local
          </button>
        ) : (
          <button 
            onClick={fetchActivitiesFromFirebase}
            disabled={isFetching}
            className={`text-micro font-bold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 ${isFetching ? 'opacity-50' : ''}`}
          >
            {isFetching ? "Syncing..." : "Fetch from Database"}
>>>>>>> Karen2.0
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 !pl-5 mb-6 !pr-5 space-y-2.5 custom-scrollbar">
        {activities.length > 0 ? (
          activities.map((item) => {
            const config = getActivityConfig(item);
<<<<<<< HEAD
            
=======
>>>>>>> Karen2.0
            return (
              <div key={item.activity_id} className="flex items-start gap-3.5 group py-1.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white border border-app-dark/10 shadow-hollow">
                  {config.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap justify-between items-baseline gap-x-2">
                    <p className="text-sm-text text-text-dark capitalize font-bold truncate max-w-[70%]">
                      {config.title}
                    </p>
                    <p className="text-nano text-text-dark/40 font-bold whitespace-nowrap">
                      {formatTimeAgo(item.timestamp)}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <p className="text-micro text-text-dark/60 uppercase truncate">
                      {item.customer_name || "System"}
                    </p>
                    <span className="hidden sm:block w-0.5 h-0.5 rounded-full bg-app-dark/10 shrink-0"></span>
                    <p className="text-nano text-text-dark border border-app-dark/10 px-1 py-0.5 rounded whitespace-nowrap bg-white/50">
                      #{item.order_number || "LOG"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 grayscale">
            <IconOrdersList className="w-11 h-11 mb-2 text-text-dark" />
<<<<<<< HEAD
            <p className="text-sm-text text-text-dark  font-medium ">No activity yet</p>
=======
            <p className="text-sm-text text-text-dark font-medium">
              {isFetching ? "Retrieving history..." : "No local activity found"}
            </p>
>>>>>>> Karen2.0
          </div>
        )}
      </div>
    </div>
  );
}