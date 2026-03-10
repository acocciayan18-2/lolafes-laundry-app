import { useMemo, useState, useEffect, useRef } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconUsers, IconInfo } from "../icons";

export default function CustomerMix({ range }) {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  
  const getAnalytics = useReportStore(state => state.getAnalytics);

  // Close info tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    }
    if (showInfo) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInfo]);

  // 🛡️ DATA GUARD: Ensure safe fetching and fallback defaults
  const stats = useMemo(() => {
    try {
      return getAnalytics(range) || {};
    } catch (e) {
      console.error("Error fetching customer mix analytics:", e);
      return {};
    }
  }, [range, getAnalytics]);

  // 🛡️ SANITIZE: Prevent NaN, negative values, or undefined crashes
  const newCount = Math.max(0, Number(stats.newCount) || 0);
  const returningCount = Math.max(0, Number(stats.returningCount) || 0);
  const retentionRate = Math.max(0, Number(stats.retentionRate) || 0);

  // PIE CHART MATH
  const totalClients = newCount + returningCount;
  const returningPct = totalClients > 0 ? (returningCount / totalClients) * 100 : 0;

  // HEATMAP COLOR LOGIC
  const { textColor, bgColor, strokeColor } = useMemo(() => {
    if (retentionRate < 30) return { textColor: "text-rose-500", bgColor: "bg-rose-500", strokeColor: "text-rose-500" };
    if (retentionRate < 70) return { textColor: "text-amber-500", bgColor: "bg-amber-500", strokeColor: "text-amber-500" };
    return { textColor: "text-emerald-500", bgColor: "bg-emerald-500", strokeColor: "text-emerald-500" };
  }, [retentionRate]);

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 transform overflow-hidden relative h-full flex flex-col">
      <div className="p-5 flex-1 flex flex-col">
        
        {/* HEADER SECTION */}
        <div className="flex items-start justify-between gap-1 mb-4">
          <div className="min-w-0 flex-1 relative">
            <div className="flex items-center gap-1.5 mb-1">
              <h2 className="text-[13px] mb-1 font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Customer Mix
              </h2>
              
              <div className="relative" ref={infoRef}>
                <button 
                  onClick={() => setShowInfo(!showInfo)}
                  className="text-text-dark/30 transition-colors focus:outline-none hover:text-text-dark/50 rounded-full"
                  aria-label="Show information"
                >
                   <IconInfo className="w-4 h-4" />
                </button>

                {showInfo && (
                  <div className="absolute left-[-50px] top-full mt-2 w-56 p-3 bg-white border border-app-dark/10 shadow-xl rounded-xl z-[100] animate-in fade-in zoom-in-95 duration-200 text-left">
                    <p className="text-[13px] text-text-dark/90 leading-relaxed font-normal">
                      This chart visualizes the ratio of New vs. Returning clients.
                    </p>
                    <p className="text-[11px] text-text-dark/70 mt-2 italic border-t border-slate-100 pt-2">
                      Overall Retention Rate: <span className="font-bold">{retentionRate.toFixed(1)}%</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <p className={`text-3xl font-bold leading-none truncate ${textColor}`}>
              {retentionRate.toFixed(0)}%
              <span className="text-sm-text text-text-dark/50 font-normal ml-1 ">Retention</span>
            </p>
          </div>
          
          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
            <IconUsers className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </div>

        {/* PIE CHART SECTION */}
        <div className="flex flex-col items-center justify-center flex-1 py-2">
          <div className="relative flex items-center justify-center w-28 h-28 drop-shadow-sm">
            {totalClients === 0 ? (
              // Empty State Pie (Gray Circle)
              <svg className="w-full h-full transform -rotate-90 rounded-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="25" fill="transparent" className="text-slate-100" stroke="currentColor" strokeWidth="50" />
              </svg>
            ) : (
              // Active Pie Chart
              <svg className="w-full h-full transform -rotate-90 rounded-full" viewBox="0 0 100 100">
                {/* Base Slice (New Clients - Gray) */}
                <circle 
                  cx="50" cy="50" r="25" 
                  fill="transparent" 
                  className="text-slate-200" 
                  stroke="currentColor" 
                  strokeWidth="50" 
                />
                {/* Overlay Slice (Returning Clients - Dynamic Heatmap Color) */}
                <circle 
                  cx="50" cy="50" r="25" 
                  fill="transparent" 
                  className={`${strokeColor} transition-all duration-1000 ease-out`} 
                  stroke="currentColor" 
                  strokeWidth="50" 
                  pathLength="100"
                  strokeDasharray={`${returningPct} ${100 - returningPct}`}
                  strokeDashoffset="0"
                />
              </svg>
            )}
          </div>
          
          {/* Detailed Counts / Legend */}
          <div className="grid grid-cols-2 w-full mt-6 gap-2">
            <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                <p className="text-sm-text text-text-dark/70 ">New</p>
              </div>
              <p className="text-base-text text-text-dark font-bold leading-tight">{newCount.toLocaleString()}</p>
            </div>

            <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${bgColor}`}></span>
                <p className="text-sm-text text-text-dark/70 ">Return</p>
              </div>
              <p className="text-base-text text-text-dark font-bold leading-tight">{returningCount.toLocaleString()}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}