import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconUsers, IconInfo } from "../icons";

/**
 * @typedef {Object} CustomerAnalytics
 * @property {number} newCount
 * @property {number} returningCount
 * @property {number} retentionRate
 */

export default function CustomerMix({ range }) {
  // --- STATE & REFS ---
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  
  // Select only the necessary slice of the store to prevent unnecessary component re-renders
  const getAnalytics = useReportStore(useCallback(state => state.getAnalytics, []));

  // --- EVENT HANDLERS ---
  const toggleInfo = useCallback(() => setShowInfo(prev => !prev), []);

  useEffect(() => {
    if (!showInfo) return;

    // Use pointerdown for better mobile compatibility
    const handleClickOutside = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    };

    const handleKeydown = (e) => {
      if (e.key === "Escape") setShowInfo(false);
    };

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [showInfo]);

  // --- DATA PROCESSING ---
  const { newCount, returningCount, retentionRate, returningPct } = useMemo(() => {
    let rawStats = {};
    try {
      rawStats = (typeof getAnalytics === 'function' ? getAnalytics(range) : {}) || {};
    } catch (e) {
      console.error("[CustomerMix] Error fetching analytics:", e);
    }

    // Sanitize: Force strict number types and provide logical boundaries (0-infinity)
    const n = Math.max(0, Math.floor(Number(rawStats.newCount) || 0));
    const r = Math.max(0, Math.floor(Number(rawStats.returningCount) || 0));
    const rate = Math.min(100, Math.max(0, Number(rawStats.retentionRate) || 0));

    const total = n + r;
    const pct = total > 0 ? (r / total) * 100 : 0;

    return { stats: rawStats, newCount: n, returningCount: r, retentionRate: rate, returningPct: pct };
  }, [range, getAnalytics]);

  // --- UI THEME LOGIC ---
  const heatmap = useMemo(() => {
    if (retentionRate < 30) return { text: "text-rose-500", bg: "bg-rose-500", stroke: "text-rose-500" };
    if (retentionRate < 70) return { text: "text-amber-500", bg: "bg-amber-500", stroke: "text-amber-500" };
    return { text: "text-emerald-500", bg: "bg-emerald-500", stroke: "text-emerald-500" };
  }, [retentionRate]);

  // --- SVG MATH CALCULATIONS ---
  // The circumference of a circle is 2 * PI * r. 
  // With r = 40, circumference is ~251.327
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  // Calculate how much of the circumference should be offset (hidden)
  const strokeDashoffset = circumference - (returningPct / 100) * circumference;

  return (
    <section 
      className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 transform overflow-hidden relative h-full flex flex-col"
      aria-labelledby="customer-mix-title"
    >
      <div className="p-5 flex-1 flex flex-col">
        
        {/* HEADER SECTION */}
        <header className="flex items-start justify-between gap-1 mb-4">
          <div className="min-w-0 flex-1 relative">
            <div className="flex items-center gap-1.5 mb-1">
              <h2 id="customer-mix-title" className="text-sm-text mb-1 font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Customer Retention
              </h2>
              
              <div className="relative" ref={infoRef}>
                <button 
                  onClick={toggleInfo}
                  className="text-text-dark/30 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-dark/20 hover:text-text-dark/50 rounded-full"
                  aria-label="Information about customer mix"
                  aria-expanded={showInfo}
                  aria-controls={showInfo ? "customer-mix-tooltip" : undefined}
                >
                   <IconInfo className="w-4 h-4" aria-hidden="true" />
                </button>

                {showInfo && (
                  <div 
                    id="customer-mix-tooltip"
                    role="tooltip"
                    className="absolute left-[-50px] top-full mt-2 w-56 p-3 bg-white border border-app-dark/10 shadow-xl rounded-xl z-[100] animate-in fade-in zoom-in-95 duration-200 text-left"
                  >
                    <p className="text-sm-text text-text-dark/90 leading-relaxed font-normal">
                      This chart visualizes the ratio of New vs. Returning clients.
                    </p>
                    <p className="text-micro text-text-dark/70 mt-2 italic border-t border-slate-100 pt-2">
                      Overall Retention Rate: <span className="font-bold">{retentionRate.toFixed(1)}%</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <p className={`text-3xl font-bold leading-none truncate ${heatmap.text}`}>
              {retentionRate.toFixed(0)}%
              <span className="text-micro text-text-dark/50 ml-1 ">Retention</span>
            </p>
          </div>
          
          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0" aria-hidden="true">
            <IconUsers className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </header>

        {/* ANALYTICS VISUALIZATION */}
        <div className="flex flex-col items-center justify-center flex-1 py-2">
         <div className="relative flex items-center justify-center w-28 h-28 drop-shadow-sm" aria-hidden="true">
  {/* SVG Progress Circle */}
  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
    {/* Background Ring (New Clients - Gray) */}
    <circle 
      cx="50" cy="50" r={radius}
      fill="transparent" 
      className="text-slate-100" 
      stroke="currentColor" 
      strokeWidth="12" 
    />
    {/* Overlay Progress Ring (Returning Clients) */}
    {newCount + returningCount > 0 && (
      <circle 
        cx="50" cy="50" r={radius} 
        fill="transparent" 
        className={`${heatmap.stroke} transition-all duration-1000 ease-out`} 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
      />
    )}
  </svg>

  {/* Inner text overlay */}
  <div className="absolute flex flex-col items-center justify-center text-center w-full px-4">
    <span 
      className="text-sm-text  text-text-dark leading-none truncate max-w-[60px] block"
      title={newCount + returningCount} 
    >
      {newCount + returningCount}
    </span>
    <span className="text-micro  text-text-dark/50 ">Total</span>
  </div>
</div>
          
          {/* LEGEND / DATA GRID */}          
          <div className="grid grid-cols-2 w-full mt-6 gap-2">
            <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-slate-300" aria-hidden="true" />
                <p className="text-sm-text text-text-dark/70">New</p>
              </div>
              <p className="text-sm-text text-text-dark font-bold leading-tight">
                {newCount.toLocaleString()}
              </p>
            </div>

            <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${heatmap.bg}`} aria-hidden="true" />
                <p className="text-sm-text text-text-dark/70">Return</p>
              </div>
              <p className="text-sm-text text-text-dark font-bold leading-tight">
                {returningCount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}