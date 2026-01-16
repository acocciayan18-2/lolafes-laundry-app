import { useMemo, useState, useEffect, useRef } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconUsers, IconInfo } from "../icons";

export default function CustomerMix({ range }) {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  
  const orders = useReportStore(state => state.orders); 
  const getAnalytics = useReportStore(state => state.getAnalytics);

  useEffect(() => {
    function handleClickOutside(event) {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stats = useMemo(() => getAnalytics(range), [orders, range, getAnalytics]);
  const { newCount, returningCount, retentionRate } = stats;

  // HEATMAP COLOR LOGIC
  // Low (<30%): Rose | Medium (30-70%): Amber | High (>70%): Emerald
  const heatmapColor = useMemo(() => {
    if (retentionRate < 30) return "text-rose-500";
    if (retentionRate < 70) return "text-amber-500";
    return "text-emerald-500";
  }, [retentionRate]);

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 transform overflow-hidden h-full relative">
      <div className="p-5">
        
        {/* Header Section */}
        <div className="flex items-start justify-between gap-1  mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-[13px] mb-1 font-bold text-text-dark/70 truncate  uppercase">
                Customer Retention
              </p>
              
              <div className="relative" ref={infoRef}>
                <button 
                  onClick={() => setShowInfo(!showInfo)}
                  className="text-text-dark/30 transition-colors"
                >
                   <IconInfo className="w-4 h-4 text-gray-400 stroke-gray-400" />
                </button>

                {showInfo && (
                  <div className="absolute left-0 top-8 w-56 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[13px] text-text-dark/90 leading-relaxed ">
                      This metric tracks the loyalty of your shop. It represents the percentage of unique customers who have returned for more than one service.
                    </p>
                    <p className="text-[11px] text-text-dark/80 mt-2 italic ">
                      Formula: (Loyal clients / Total unique clients) x 100
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Value also inherits heatmap color for visual emphasis */}
            <p className={`text-3xl font-bold leading-none truncate ${heatmapColor}`}>
              {retentionRate.toFixed(0)}%
            </p>
          </div>
          
          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
            <IconUsers className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </div>

        {/* Circular Progress with Heatmap Color */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative flex items-center justify-center w-28 h-28">
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="50%" cy="50%" r="40%" 
                stroke="currentColor" strokeWidth="8" fill="transparent" 
                className="text-app-dark/5" 
              />
              <circle 
                cx="50%" cy="50%" r="40%" 
                stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray="251.2" 
                strokeDashoffset={251.2 - (251.2 * retentionRate) / 100}
                className={`${heatmapColor} transition-all duration-1000 ease-out`} 
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center w-20 px-1 pointer-events-none">
              <span 
                className="w-full text-center text-lg text-text-dark font-bold leading-none truncate"
                title={(returningCount).toLocaleString()}
              >
                {(returningCount).toLocaleString()}
              </span>
              <span className="text-[10px] text-text-dark/40  mt-1">
                Loyal
              </span>
            </div>
          </div>
          
          {/* Detailed Counts */}
          <div className="grid grid-cols-2 w-full mt-6 gap-2">
            <div className="text-center p-2 rounded-lg bg-white border border-app-dark/50">
              <p className="text-base  text-text-dark font-bold leading-tight">{newCount}</p>
              <p className="text-[12px] text-text-dark/90">New Clients</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-transparent border border-app-dark/50 ">
              <p className="text-base  text-text-dark font-bold leading-tight">{returningCount}</p>
              <p className="text-[12px] text-text-dark/90">Returning</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}