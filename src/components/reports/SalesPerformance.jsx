import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { useReportStore } from "../../store/reports/useReportStore";
import { IconInfo, IconTrendingUp } from "../icons";

// ==========================================
// CONFIGURATION & CONSTANTS (Frozen)
// ==========================================
const TIME_FILTERS = Object.freeze([
  { label: "Today", value: "day" },
  { label: "Days", value: "days" }, 
  { label: "Weeks", value: "week" }, 
  { label: "Months", value: "month" }
]);

// ==========================================
// UTILITY HELPERS
// ==========================================

/**
 * @description Safely parses numbers to avoid NaN injections and floating-point geometry bugs.
 * Retains up to 2 decimal places in memory without rounding away the cents.
 */
const safeMoney = (val) => {
  const num = Number(val);
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100) / 100; 
};

/**
 * @description Smart formatter: Shows .00 ONLY if there are actual cents.
 * Otherwise, returns a clean integer string.
 */
const formatSmartMoney = (val) => {
  const num = Number(val) || 0;
  // Check if the number has a fractional remainder
  if (num % 1 !== 0) {
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const formatXAxisLabel = (label, range) => {
  if (!label) return "";
  
  if (range === "day") {
    const hour = parseInt(label, 10);
    if (isNaN(hour)) return label;
    if (hour === 24 || hour === 0) return '12am';
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${ampm}`;
  }
  
  if (range === "week") {
    return String(label).toLowerCase().includes("week") ? label : `Wk ${label}`;
  }

  return String(label).substring(0, 10); // Sanitize extreme lengths
};

// ==========================================
// ATOMIC COMPONENTS
// ==========================================

/**
 * @component ChartBar
 * @description Memoized individual bar to prevent O(N) chart re-renders on hover.
 */
const ChartBar = React.memo(({ data, maxVal, isActive, isPeak, onHover, onLeave, onClick }) => {
  // Ensure we don't divide by zero
  const heightPerc = maxVal > 0 ? (data.value / maxVal) * 100 : 0;
  
  // Theme selection based on state
  let barColor = "from-blue-500 to-sky-400"; // Default
  if (isPeak) barColor = "from-emerald-500 to-teal-400"; // Highlight highest revenue
  if (data.value === 0) barColor = "from-slate-200 to-slate-100"; // Empty state
  
  // Opacity dimming for non-active bars when another bar is hovered
  const opacityClass = isActive === false ? "opacity-40" : "opacity-100";

  return (
    <div 
      className="flex-1 flex flex-col items-center h-full justify-end relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-app-dark rounded-t-md group"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      onFocus={onHover}
      onBlur={onLeave}
      tabIndex={0}
      role="graphics-symbol"
      aria-label={`${data.label}: ₱${formatSmartMoney(data.value)}`}
    >
      {/* TOOLTIP (Absolutely positioned above the bar) */}
      <div 
        className={`absolute -top-12 transition-all duration-200 z-[60] pointer-events-none flex flex-col items-center
          ${isActive === true ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
        aria-hidden="true"
      >
        <div className="bg-app-dark text-white shadow-xl rounded-md px-2.5 py-1.5 whitespace-nowrap">
          <p className="text-micro font-bold tracking-wide">₱{formatSmartMoney(data.value)}</p>
        </div>
        {/* Tooltip Arrow */}
        <div className="w-2.5 h-2.5 bg-app-dark rotate-45 -mt-1.5" />
      </div>

      {/* THE BAR */}
      <div 
        className={`w-full max-w-[28px] transition-all duration-500 rounded-t-md bg-gradient-to-t shadow-sm ${barColor} ${opacityClass} relative overflow-hidden`}
        style={{ height: `${heightPerc}%`, minHeight: data.value > 0 ? '4px' : '2px' }}
      >
        {/* Glossy overlay effect for 3D feel */}
        <div className="absolute inset-0 bg-white opacity-10 w-full h-full" />
      </div>
      
      {/* X-AXIS LABEL */}
      <span 
        className={`absolute -bottom-6 text-nano uppercase whitespace-nowrap w-full text-center px-0.5 transition-colors
        ${isActive === true ? 'text-app-dark font-bold' : isPeak ? 'text-emerald-700 font-bold' : 'text-text-dark/70 '}`}
        aria-hidden="true"
      >
        {data.formattedLabel}
      </span>
    </div>
  );
});
ChartBar.displayName = "ChartBar";

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function SalesPerformance() {
  // --- STATE & REFS ---
  const [selectedFilter, setSelectedFilter] = useState(TIME_FILTERS[0]);
  const [showInfo, setShowInfo] = useState(false);
  const [activeBarIndex, setActiveBarIndex] = useState(null); 
  
  const infoRef = useRef(null);
  const chartContainerRef = useRef(null);
  
  const getSalesTrend = useReportStore(useCallback(state => state.getSalesTrend, []));

  // --- EVENT HANDLERS ---
  useEffect(() => {
    const handlePointerDown = (event) => {
      // Close Info Tooltip
      if (showInfo && infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
      // Clear Active Bar selection if clicking outside the chart
      if (activeBarIndex !== null && chartContainerRef.current && !chartContainerRef.current.contains(event.target)) {
        setActiveBarIndex(null);
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowInfo(false);
        setActiveBarIndex(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEsc);
    
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showInfo, activeBarIndex]);

  // --- DATA PROCESSING & MEMOIZATION ---
  const { chartData, maxVal, totalInPeriod, peakIndex } = useMemo(() => {
    let rawData = [];
    try {
      rawData = getSalesTrend(selectedFilter.value) || [];
    } catch (err) {
      console.error("[SalesPerformance] Failed to fetch trend data:", err);
    }

    // 1. Filter Logic
    let filteredData = rawData;
    if (selectedFilter.value === "day") {
      filteredData = rawData.filter(item => {
        const hour = parseInt(item.label, 10);
        return hour >= 5 && hour <= 24; // 5am to midnight
      });
    }

    // 2. Sanitize and Format
    let currentPeak = 0;
    let currentPeakIdx = -1;
    let total = 0;

    const processedData = filteredData.map((d, index) => {
      const val = safeMoney(d.value);
      total += val;
      
      if (val > currentPeak) {
        currentPeak = val;
        currentPeakIdx = index;
      }

      return {
        ...d,
        value: val,
        formattedLabel: formatXAxisLabel(d.label, selectedFilter.value)
      };
    });

    // Determine Y-Axis scale boundary (add 10% padding to top so bars don't hit the ceiling)
    const yAxisMax = currentPeak > 0 ? currentPeak * 1.1 : 1000;

    return { 
      chartData: processedData, 
      maxVal: yAxisMax, 
      totalInPeriod: total,
      peakIndex: currentPeakIdx
    };
  }, [selectedFilter.value, getSalesTrend]);

  return (
    <section 
      className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 h-full relative overflow-visible flex flex-col"
      aria-labelledby="sales-performance-title"
    >
      <div className="p-5 overflow-visible flex-1 flex flex-col">
        
        {/* HEADER SECTION */}
        <header className="flex justify-between items-start gap-1 mb-2 shrink-0">
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            <div className="flex items-center gap-2">
              <h2 id="sales-performance-title" className="text-sm-text font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Revenue Analysis
              </h2>
              <button 
                onClick={() => setShowInfo(!showInfo)} 
                aria-expanded={showInfo}
                aria-label="Information about Revenue Analysis"
                className="text-text-dark/30 hover:text-app-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-dark/20 transition-colors rounded-full"
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
                    className="absolute left-0 top-7 w-56 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]"
                  >
                    <p className="text-sm-text text-text-dark/90 leading-relaxed font-normal">
                      View revenue trends across different timeframes. The <span className="text-emerald-600 font-bold">green bar</span> indicates your peak earning period.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* HEADLESS UI DROPDOWN */}
            <div className="relative mt-2 w-[110px] z-[90]"> 
              <Listbox 
                value={selectedFilter} 
                onChange={(val) => {
                  setSelectedFilter(val);
                  setActiveBarIndex(null); 
                }}
              >
                {({ open }) => (
                  <>
                    <ListboxButton className="relative w-full cursor-pointer bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 pl-3 pr-8 text-sm-text font-bold text-text-dark text-left hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-app-dark/20">
                      <span className="block truncate  text-sm-text">{selectedFilter.label}</span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <motion.svg 
                          animate={{ rotate: open ? 180 : 0 }}
                          className="w-4 h-4 text-text-dark/50" 
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </motion.svg>
                      </span>
                    </ListboxButton>

                    <AnimatePresence>
                      {open && (
                        <ListboxOptions
                          static
                          as={motion.ul}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute mt-1.5 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-xl border border-slate-100 ring-1 ring-black ring-opacity-5 focus:outline-none"
                        >
                          {TIME_FILTERS.map((f) => (
                            <ListboxOption
                              key={f.value}
                              value={f}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2.5 pl-3 pr-3 text-sm-text  transition-colors ${
                                  active ? 'bg-app-dark/5 text-app-dark' : 'text-text-dark/80'
                                }`
                              }
                            >
                              {({ selected }) => (
                                <span className={`block truncate ${selected ? 'font-bold text-app-dark' : ''}`}>
                                  {f.label}
                                </span>
                              )}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </Listbox>
            </div>
          </div>
          
          <div className="p-2.5 rounded-lg border border-app-dark/10 shadow-hollow shrink-0 bg-transparent" aria-hidden="true">
            <IconTrendingUp className="w-5 h-5 text-text-dark/90 stroke-text-dark/90" />
          </div>
        </header>

        {/* CHART VISUALIZATION AREA */}
        <div 
          className="flex flex-1 gap-2 overflow-visible" 
          ref={chartContainerRef}
          role="graphics-document"
          aria-label="Bar chart showing revenue over time"
        >
          
          {/* Y-Axis Labels */}
          <div className="flex flex-col justify-between h-[160px] pb-6 text-sm-text text-text-dark/90  text-right min-w-[45px] pr-2 mt-12" aria-hidden="true">
            <span>₱{formatSmartMoney(maxVal)}</span>
            <span>₱{formatSmartMoney(maxVal / 2)}</span>
            <span>0</span>
          </div>

          {/* Chart Bars Area */}
          <div className="flex-1 overflow-x-auto no-scrollbar overflow-y-visible pt-12">
            <div 
              className="flex items-end justify-between h-[160px] pb-6 relative overflow-visible px-2" 
              style={{ 
                minWidth: selectedFilter.value === 'days' ? '1000px' : (selectedFilter.value === 'day' || selectedFilter.value === 'month') ? '600px' : '100%',
                gap: selectedFilter.value === 'days' ? '8px' : '4px'
              }}
            >
              
              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 px-2" aria-hidden="true">
                <div className="w-full border-t border-dashed border-app-dark/10" />
                <div className="w-full border-t border-dashed border-app-dark/10" />
                <div className="w-full border-t-2 border-app-dark/10" />
              </div>

              {/* Data Bars */}
              {chartData.length > 0 ? chartData.map((data, i) => (
                <ChartBar 
                  key={`bar-${i}`}
                  data={data}
                  maxVal={maxVal}
                  isPeak={i === peakIndex}
                  isActive={activeBarIndex === null ? null : activeBarIndex === i}
                  onHover={() => setActiveBarIndex(i)}
                  onLeave={() => setActiveBarIndex(null)}
                  onClick={() => setActiveBarIndex(i === activeBarIndex ? null : i)}
                />
              )) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm-text font-bold text-text-dark/40 uppercase tracking-widest pb-6">
                  No data for this period
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER METADATA */}
      <footer className="mx-5 mb-4 mt-auto border-t border-app-dark/5 pt-3 flex justify-between items-center">
        <div className="flex flex-col">
          <p className="text-nano text-text-dark/50 uppercase  font-bold mb-0.5">
            Total {selectedFilter.label} Revenue
          </p>
          <p className="text-xl text-text-dark font-bold tracking-tight leading-none">
            ₱{formatSmartMoney(totalInPeriod)}
          </p>
        </div>
      </footer>
    </section>
  );
}