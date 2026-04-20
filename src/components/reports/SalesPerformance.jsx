import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { useReportStore } from "../../store/reports/useReportStore";
import { IconInfo, IconTrendingUp } from "../icons";

// ==========================================
// 🛡️ DYNAMIC CONFIGURATION
// ==========================================
const generateTimeFilters = () => {
  const currentYear = new Date().getFullYear();
  return [
    { id: "today", label: "Today", payload: { range: "day" } },
    { id: "this_month", label: "This Month", payload: { range: "days" } }, 
    { id: `year_${currentYear}`, label: `This Year (${currentYear})`, payload: { range: "month", year: currentYear } },
    { id: `year_${currentYear - 1}`, label: `Last Year (${currentYear - 1})`, payload: { range: "month", year: currentYear - 1 } },
    { id: `year_${currentYear - 2}`, label: `Year ${currentYear - 2}`, payload: { range: "month", year: currentYear - 2 } }
  ];
};

const TIME_FILTERS = Object.freeze(generateTimeFilters());

// ==========================================
// 🛡️ DEFENSIVE UTILITIES
// ==========================================
const safeMoney = (val) => {
  const num = Number(val);
  return (isNaN(num) || num < 0) ? 0 : Math.round(num * 100) / 100; 
};

const formatSmartMoney = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: num % 1 !== 0 ? 2 : 0, 
    maximumFractionDigits: num % 1 !== 0 ? 2 : 0 
  });
};

const formatXAxisLabel = (label, range) => {
  if (!label) return "";
  const cleanLabel = String(label).replace(/[<>]/g, ""); 
  
  if (range === "day") {
    const hour = parseInt(cleanLabel, 10);
    if (isNaN(hour)) return cleanLabel;
    if (hour === 24 || hour === 0) return '12am';
    return `${hour % 12 || 12}${hour >= 12 ? 'pm' : 'am'}`;
  }
  return cleanLabel.substring(0, 10);
};

// ==========================================
// 🧩 ATOMIC COMPONENTS
// ==========================================
const ChartSkeleton = () => (
  <div className="absolute inset-0 flex items-end justify-between px-2 pb-6 space-x-2 animate-pulse" aria-hidden="true">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="flex-1 bg-slate-200 rounded-t-md" style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
    ))}
  </div>
);

const ChartBar = React.memo(({ data, maxVal, isActive, isPeak, isDrillable, onHover, onLeave, onClick }) => {
  const heightPerc = maxVal > 0 ? (data.value / maxVal) * 100 : 0;
  
  let barColor = "from-blue-500 to-sky-400"; 
  if (isPeak) barColor = "from-emerald-500 to-teal-400"; 
  if (data.value === 0) barColor = "from-slate-200 to-slate-100"; 
  
  const opacityClass = isActive === false ? "opacity-40" : "opacity-100";

  return (
    <div 
      className={`flex-1 flex flex-col items-center h-full justify-end relative outline-none focus-visible:ring-2 focus-visible:ring-app-dark rounded-t-md group
        ${isDrillable && data.value > 0 ? 'cursor-zoom-in' : 'cursor-pointer'}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      onFocus={onHover}
      onBlur={onLeave}
      tabIndex={0}
      role="button"
      aria-label={`${data.label}: ₱${formatSmartMoney(data.value)} ${isDrillable ? 'Click to view daily breakdown' : ''}`}
    >
      <div 
        className={`absolute -top-12 transition-all duration-200 z-[60] pointer-events-none flex flex-col items-center
          ${isActive === true ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
        aria-hidden="true"
      >
        <div className="bg-app-dark text-white shadow-xl rounded-md px-2.5 py-1.5 whitespace-nowrap">
          <p className="text-micro font-normal tracking-wide">
            {isDrillable && data.value > 0 ? `₱${formatSmartMoney(data.value)}` : `₱${formatSmartMoney(data.value)}`}
          </p>
        </div>
        <div className="w-2.5 h-2.5 bg-app-dark rotate-45 -mt-1.5" />
      </div>

      <div 
        className={`w-full max-w-[28px] transition-all duration-500 rounded-t-md bg-gradient-to-t shadow-sm ${barColor} ${opacityClass} relative overflow-hidden`}
        style={{ height: `${heightPerc}%`, minHeight: data.value > 0 ? '4px' : '2px' }}
      >
        <div className="absolute inset-0 bg-white opacity-10 w-full h-full" />
      </div>
      
      <span className={`absolute -bottom-6 text-nano uppercase whitespace-nowrap w-full text-center px-0.5 transition-colors ${isActive === true ? 'text-app-dark font-bold' : isPeak ? 'text-emerald-700 font-bold' : 'text-text-dark/70'}`} aria-hidden="true">
        {data.formattedLabel}
      </span>
    </div>
  );
});
ChartBar.displayName = "ChartBar";

// ==========================================
// 🚀 MAIN COMPONENT
// ==========================================
export default function SalesPerformance() {
  const [selectedFilter, setSelectedFilter] = useState(TIME_FILTERS[0]);
  const [showInfo, setShowInfo] = useState(false);
  const [activeBarIndex, setActiveBarIndex] = useState(null); 
  
  const infoRef = useRef(null);
  const chartContainerRef = useRef(null);
  
  const fetchSalesTrend = useReportStore(state => state.fetchSalesTrend);
  const rawChartData = useReportStore(state => state.salesTrendData);
  const isLoading = useReportStore(state => state.isTrendLoading);
  const error = useReportStore(state => state.trendError);

  useEffect(() => {
    const abortController = new AbortController();
    if (typeof fetchSalesTrend === 'function') {
      fetchSalesTrend(selectedFilter.payload, abortController.signal);
    }
    return () => abortController.abort();
  }, [selectedFilter, fetchSalesTrend]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (showInfo && infoRef.current && !infoRef.current.contains(event.target)) setShowInfo(false);
      if (activeBarIndex !== null && chartContainerRef.current && !chartContainerRef.current.contains(event.target)) setActiveBarIndex(null);
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

  const { chartData, maxVal, totalInPeriod, peakIndex } = useMemo(() => {
    if (!Array.isArray(rawChartData)) return { chartData: [], maxVal: 100, totalInPeriod: 0, peakIndex: -1 };

    let currentPeak = 0;
    let currentPeakIdx = -1;
    let total = 0;
    const processedData = [];
    const isDayFilter = selectedFilter.payload.range === "day";

    for (let i = 0; i < rawChartData.length; i++) {
      const d = rawChartData[i];
      if (isDayFilter) {
        const hour = parseInt(d.label, 10);
        if (hour < 5 || hour > 24) continue;
      }
      const val = safeMoney(d.value);
      total += val;
      if (val > currentPeak) { currentPeak = val; currentPeakIdx = processedData.length; }

      processedData.push({
        ...d, value: val, formattedLabel: formatXAxisLabel(d.label, selectedFilter.payload.range)
      });
    }

    return { 
      chartData: processedData, 
      maxVal: currentPeak > 0 ? currentPeak : 100, // ✨ FIX: Removed the 10% artificial padding
      totalInPeriod: total,
      peakIndex: currentPeakIdx
    };
  }, [rawChartData, selectedFilter.payload.range]);

  // ✨ DRILL DOWN HANDLER
  const handleBarClick = (index, data) => {
    if (selectedFilter.payload.range === 'month' && data.value > 0) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const targetYear = selectedFilter.payload.year;
      
      setSelectedFilter({
        id: `drilldown_${targetYear}_${index}`,
        label: `${monthNames[index]} ${targetYear} (Daily)`,
        isDrillDown: true,
        parentFilter: selectedFilter, // Keep history to go back
        payload: { range: 'specific_month', year: targetYear, month: index }
      });
      setActiveBarIndex(null);
    } else {
      setActiveBarIndex(index === activeBarIndex ? null : index);
    }
  };

  const isWideChart = ['days', 'specific_month'].includes(selectedFilter.payload.range);

  return (
    <section className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 h-full relative overflow-visible flex flex-col" aria-labelledby="sales-performance-title">
      <div className="p-5 overflow-visible flex-1 flex flex-col">
        
        {/* HEADER SECTION */}
        <header className="flex justify-between items-start gap-1 mb-2 shrink-0">
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            <div className="flex items-center gap-2">
              <h2 id="sales-performance-title" className="text-sm-text font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Sales Analysis
              </h2>
              
              {/* ✨ BACK BUTTON FOR DRILL-DOWN */}
              {selectedFilter.isDrillDown && (
                <button 
                  onClick={() => setSelectedFilter(selectedFilter.parentFilter)}
                  className="flex items-center gap-1 text-nano font-bold text-app-dark hover:text-emerald-600 transition-colors bg-app-dark/5 px-2 py-1 rounded-md"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                  Back to {selectedFilter.parentFilter.payload.year}
                </button>
              )}

              <button onClick={() => setShowInfo(!showInfo)} aria-expanded={showInfo} className="text-text-dark/30 hover:text-app-dark focus:outline-none focus-visible:ring-2 rounded-full">
                 <IconInfo className="w-4 h-4" aria-hidden="true" />
              </button>
              
              <AnimatePresence>
                {showInfo && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute left-0 top-7 w-56 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]" role="tooltip">
                    <p className="text-sm-text text-text-dark/90 leading-relaxed font-normal">
                      View sales trends securely fetched from historical data. Click on any month bar to zoom into the daily breakdown.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SECURE DROPDOWN */}
           <div className="relative mt-2 w-max min-w-[130px] z-10" aria-label="Select time range for sales performance"> 
  <Listbox value={selectedFilter} onChange={(val) => { setSelectedFilter(val); setActiveBarIndex(null); }} disabled={isLoading}>
    {({ open }) => (
      <>
        <ListboxButton className="relative w-full cursor-pointer bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 pl-3 pr-8 text-sm-text font-bold text-text-dark text-left hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/20 transition-all">
          <span className="block truncate text-sm-text">{selectedFilter.label}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            
            <svg 
              className={`w-4 h-4 text-text-dark/50 transition-transform duration-200 ease-in-out ${open ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>

          </span>
        </ListboxButton>

        <AnimatePresence>
          {open && (
            <ListboxOptions static as={motion.ul} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute mt-1.5 max-h-60 w-max min-w-full overflow-auto rounded-xl bg-white py-1 shadow-xl border border-slate-100 focus:outline-none z-[100]">
              {TIME_FILTERS.map((f) => (
                <ListboxOption key={f.id} value={f} className={({ active }) => `relative cursor-pointer select-none py-2.5 pl-3 pr-4 text-sm-text transition-colors ${active ? 'bg-app-dark/5 text-app-dark font-bold' : 'text-text-dark/80'}`}>
                  <span className="block truncate">{f.label}</span>
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

        {error && !isLoading && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg text-center" role="alert">Failed to load chart data. Please try again.</div>
        )}

        {/* CHART VISUALIZATION AREA */}
        <div className="flex flex-1 gap-2 overflow-visible relative" ref={chartContainerRef} role="graphics-document" aria-busy={isLoading}>
          <div className="flex flex-col justify-between h-[160px] pb-6 text-sm-text text-text-dark/90 text-right min-w-[45px] pr-2 mt-12" aria-hidden="true">
            <span>₱{formatSmartMoney(maxVal)}</span>
            <span>₱{formatSmartMoney(maxVal / 2)}</span>
            <span>0</span>
          </div>

          <div className="flex-1 overflow-x-auto no-scrollbar overflow-y-visible pt-12 relative">
            {isLoading && <ChartSkeleton />}
            {!isLoading && (
              <div 
                className="flex items-end justify-between h-[160px] pb-6 relative overflow-visible px-2" 
                style={{ 
                  minWidth: isWideChart ? '1000px' : (selectedFilter.payload.range === 'day' || selectedFilter.payload.range === 'month') ? '600px' : '100%',
                  gap: isWideChart ? '8px' : '4px'
                }}
              >
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 px-2" aria-hidden="true">
                  <div className="w-full border-t border-dashed border-app-dark/10" />
                  <div className="w-full border-t border-dashed border-app-dark/10" />
                  <div className="w-full border-t-2 border-app-dark/10" />
                </div>

                {chartData.length > 0 ? chartData.map((data, i) => (
                  <ChartBar 
                    key={`bar-${i}`}
                    data={data}
                    maxVal={maxVal}
                    isPeak={i === peakIndex}
                    isActive={activeBarIndex === null ? null : activeBarIndex === i}
                    isDrillable={selectedFilter.payload.range === 'month'}
                    onHover={() => setActiveBarIndex(i)}
                    onLeave={() => setActiveBarIndex(null)}
                    onClick={() => handleBarClick(i, data)}
                  />
                )) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm-text font-bold text-text-dark/40 uppercase tracking-widest pb-6">No data for this period</div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      <footer className="mx-5 mb-4 mt-auto border-t border-app-dark/5 pt-3 flex justify-between items-center">
        <div className="flex flex-col">
          <p className="text-nano text-text-dark/50 uppercase font-bold mb-0.5" aria-live="polite">
            Total {selectedFilter.label} Sales
          </p>
          <p className="text-h2 text-text-dark font-bold tracking-tight leading-none">
            ₱{isLoading ? "..." : formatSmartMoney(totalInPeriod)}
          </p>
        </div>
      </footer>
    </section>
  );
}