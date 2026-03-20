import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconAward, IconInfo } from "../icons";

// ==========================================
// SECURITY & UTILITY HELPERS
// ==========================================

/**
 * @description Defends against Stored XSS. If the backend fails to sanitize 
 * user profile names, this strips HTML brackets and limits length to prevent flex-box breaks.
 */
const sanitizeCustomerName = (name) => {
  if (!name || typeof name !== 'string') return "Unknown";
  return name.replace(/[<>]/g, '').trim().substring(0, 20) || "Unknown";
};

/**
 * @description Ensures numbers are strictly integers to prevent NaN layout crashes.
 */
const safeInt = (val) => {
  const num = parseInt(val, 10);
  return isNaN(num) || num < 0 ? 0 : num;
};

// ==========================================
// ATOMIC COMPONENTS
// ==========================================

/**
 * @component ChartRow
 * @description Memoized atomic component for O(1) rendering of individual graph bars.
 */
const ChartRow = React.memo(({ rank, name, count, maxOrders }) => {
  // Prevent division by zero
  const widthPercentage = maxOrders > 0 ? (count / maxOrders) * 100 : 0;
  
  // Dynamic Theming: Gold (1), Silver (2), Bronze (3), Blue (Others)
  let barColor = "from-blue-500 to-sky-400";
  let nameColor = "text-text-dark/70";
  let isPodium = false;

  if (rank === 1) {
    barColor = "from-amber-400 to-yellow-300";
    nameColor = "text-amber-600 font-bold";
    isPodium = true;
  } else if (rank === 2) {
    barColor = "from-slate-400 to-slate-300";
    nameColor = "text-slate-600 font-bold";
    isPodium = true;
  } else if (rank === 3) {
    barColor = "from-orange-400 to-amber-600";
    nameColor = "text-orange-700 font-bold";
    isPodium = true;
  }

  return (
    <div 
      className="relative flex items-center group outline-none focus-visible:bg-slate-50 rounded-r-md transition-colors h-8"
      role="graphics-symbol"
      tabIndex={0}
      aria-label={`Rank ${rank}: ${name} with ${count} orders`}
    >
      {/* Y-Axis Label (Left Side) */}
      <div className="w-28 sm:w-32 pr-3 shrink-0 flex items-center justify-end border-r-2 border-slate-100 h-full z-10">
        <span className={`text-nano sm:text-micro truncate text-right w-full ${isPodium ? nameColor : ' text-text-dark/60 group-hover:text-text-dark transition-colors'}`} title={name}>
          {name}
        </span>
      </div>

      {/* X-Axis Bar Area (Right Side) */}
      <div className="flex-1 flex items-center h-full relative z-10 pr-4">
        {/* The Animated Bar */}
        <motion.div 
          className={`h-[18px] rounded-r-sm bg-gradient-to-r shadow-sm ${barColor} relative flex items-center`}
          initial={{ width: 0 }}
          animate={{ width: `${widthPercentage}%` }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1], delay: rank * 0.05 }}
          // ✨ FIX: Guarantee a minimum width so the left-aligned text never spills out of the bar
          style={{ minWidth: count > 0 ? '24px' : '0px' }}
        >
           {/* Glossy 3D Highlight */}
           <div className="absolute top-0 left-0 right-0 bg-white/20 h-1.5 rounded-tr-sm" />

           {/* The Value Label ✨ FIX: Pinned to the far left inside the bar */}
           <motion.span 
              className="absolute left-2 text-nano font-bold tabular-nums transition-colors drop-shadow-sm text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: (rank * 0.05) + 0.5 }}
            >
              {count}
            </motion.span>
        </motion.div>
      </div>
    </div>
  );
});
ChartRow.displayName = "ChartRow";

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function TopCustomers({ range }) {
  // --- STATE & REFS ---
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  
  const getAnalytics = useReportStore(useCallback(state => state.getAnalytics, []));

  // --- EVENT HANDLERS ---
  const toggleInfo = useCallback(() => setShowInfo(prev => !prev), []);

  useEffect(() => {
    if (!showInfo) return;

    const handleClickOutside = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowInfo(false);
    };

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showInfo]);

  // --- DATA PROCESSING & MEMOIZATION ---
  const { safeCustomers, maxOrders } = useMemo(() => {
    let rawCustomers = [];
    
    try {
      const stats = getAnalytics(range) || {};
      rawCustomers = Array.isArray(stats.topCustomers) ? stats.topCustomers : [];
    } catch (err) {
      console.error("[TopCustomers] Analytics retrieval failed:", err);
    }

    // Process, sanitize, and strictly cap at Top 10
    const processed = rawCustomers
      .map(c => ({
        name: sanitizeCustomerName(c?.name),
        count: safeInt(c?.count)
      }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); 

    const max = processed.length > 0 ? processed[0].count : 1;
    // Add 10% padding to max so the longest bar doesn't touch the right edge
    const chartMax = Math.ceil(max * 1.1);

    return { safeCustomers: processed, maxOrders: chartMax };
  }, [range, getAnalytics]);

  return (
    <section 
      className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 relative h-full flex flex-col"
      aria-labelledby="top-customers-title"
    >
      <div className="p-5 flex flex-col h-full overflow-hidden">
        
        {/* HEADER SECTION */}
        <header className="flex items-start justify-between gap-1 shrink-0 mb-4">
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            <div className="flex items-center gap-1.5 mb-1">
              <h2 id="top-customers-title" className="text-sm-text font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Top Customers
              </h2>
              <button 
                onClick={toggleInfo}
                aria-expanded={showInfo}
                aria-label="Information about VIP Graph"
                className="text-text-dark/30 hover:text-app-dark transition-colors focus:outline-none focus:ring-2 focus:ring-app-dark/20 rounded-full"
              >
                <IconInfo className="w-4 h-4" aria-hidden="true" />
              </button>

              <AnimatePresence>
                {showInfo && (
                  <motion.div 
                    role="tooltip"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute left-0 top-7 w-64 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]"
                  >
                    <p className="text-sm-text text-text-dark/90 leading-relaxed font-normal">
                      A horizontal bar graph visualizing the order volume of your top 10 most frequent visitors.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0" aria-hidden="true">
            <IconAward className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </header>

        {/* CHART AREA */}
        <div 
          className="flex flex-col flex-1 relative overflow-y-auto custom-scrollbar min-h-[200px] pt-1"
          role="graphics-document"
          aria-label="Horizontal bar chart of top customers"
        >
          {safeCustomers.length > 0 ? (
            <div className="relative flex flex-col flex-1">
              
              {/* Vertical Grid Lines (Background) */}
              <div className="absolute inset-y-0 left-28 sm:left-32 right-4 flex justify-between pointer-events-none z-0" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={`grid-${i}`} className={`h-full w-px ${i === 0 ? 'bg-transparent' : 'bg-slate-100 border-r border-dashed border-slate-200'}`} />
                ))}
              </div>

              {/* Graph Rows */}
              <div className="flex flex-col gap-1 pb-2">
                {safeCustomers.map((customer, i) => (
                  <ChartRow 
                    key={`vip-${i}-${customer.name}`}
                    rank={i + 1}
                    name={customer.name}
                    count={customer.count}
                    maxOrders={maxOrders}
                  />
                ))}
              </div>
              
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center opacity-40 h-full">
              <IconAward className="w-8 h-8 mb-2" aria-hidden="true" />
              <p className="text-nano font-bold text-text-dark uppercase tracking-widest">No customers data yet</p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}