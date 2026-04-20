import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { useReportStore } from "../../store/reports/useReportStore";
import { IconAward, IconInfo } from "../icons";

// ==========================================
// 🛡️ DYNAMIC CONFIGURATION
// ==========================================
const generateTimeFilters = () => {
  const currentYear = new Date().getFullYear();
  return [
    { id: "today", label: "Today", payload: { range: "days", value: 1 } },
    { id: "7_days", label: "Last 7 Days", payload: { range: "days", value: 7 } },
    { id: "30_days", label: "Last 30 Days", payload: { range: "days", value: 30 } },
    { id: `year_${currentYear}`, label: `This Year (${currentYear})`, payload: { range: "year", value: currentYear } },
    { id: `year_${currentYear - 1}`, label: `Last Year (${currentYear - 1})`, payload: { range: "year", value: currentYear - 1 } }
  ];
};

const TIME_FILTERS = Object.freeze(generateTimeFilters());

// ==========================================
// SECURITY & UTILITY HELPERS
// ==========================================
const sanitizeCustomerName = (name) => {
  if (!name || typeof name !== 'string') return "Unknown";
  return name.replace(/[<>]/g, '').trim().substring(0, 20) || "Unknown";
};

const safeInt = (val) => {
  const num = parseInt(val, 10);
  return isNaN(num) || num < 0 ? 0 : num;
};

// ==========================================
// ATOMIC COMPONENTS
// ==========================================
const ChartRowSkeleton = () => (
  <div className="flex flex-col gap-3 animate-pulse px-2" aria-hidden="true">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 w-full h-8">
        <div className="w-24 h-4 bg-slate-200 rounded shrink-0"></div>
        <div className="h-full bg-slate-200 rounded" style={{ width: `${Math.max(20, 100 - (i * 15))}%` }}></div>
      </div>
    ))}
  </div>
);

const ChartRow = React.memo(({ rank, name, count, maxOrders }) => {
  const widthPercentage = maxOrders > 0 ? (count / maxOrders) * 100 : 0;
  
  let barColor = "from-blue-500 to-sky-400";
  let nameColor = "text-text-dark/70";
  let isPodium = false;

  if (rank === 1) {
    barColor = "from-amber-400 to-yellow-300";
    nameColor = "text-amber-600 font-bold";
    isPodium = true;
  } else if (rank === 2) {
    barColor = "from-slate-400 to-slate-300";
    nameColor = "text-text-dark font-bold";
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
      <div className="w-28 sm:w-32 pr-3 shrink-0 flex items-center justify-end border-r-2 border-slate-100 h-full z-10">
        <span className={`text-nano sm:text-micro truncate text-right w-full ${isPodium ? nameColor : 'text-text-dark/60 group-hover:text-text-dark transition-colors'}`} title={name}>
          {name}
        </span>
      </div>

      <div className="flex-1 flex items-center h-full relative z-10 pr-4">
        <motion.div 
          className={`h-[18px] rounded-r-sm bg-gradient-to-r shadow-sm ${barColor} relative flex items-center`}
          initial={{ width: 0 }}
          animate={{ width: `${widthPercentage}%` }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1], delay: rank * 0.05 }}
          style={{ minWidth: count > 0 ? '24px' : '0px' }}
        >
           <div className="absolute top-0 left-0 right-0 bg-white/20 h-1.5 rounded-tr-sm" />
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

export default function TopCustomers() {
  const [selectedFilter, setSelectedFilter] = useState(TIME_FILTERS[2]); // Default to 30 Days
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  
  // Zustand Async Selectors
  const fetchKpiAnalytics = useReportStore(state => state.fetchKpiAnalytics);
  const kpiData = useReportStore(state => state.kpiData);
  const isLoading = useReportStore(state => state.isKpiLoading);
  const error = useReportStore(state => state.kpiError);

  // --- EVENT HANDLERS ---
  const toggleInfo = useCallback(() => setShowInfo(prev => !prev), []);

  // ✨ QA RESILIENCE: Server-Side Fetching Trigger
  useEffect(() => {
    const abortController = new AbortController();
    if (typeof fetchKpiAnalytics === 'function') {
      fetchKpiAnalytics(selectedFilter.payload, abortController.signal);
    }
    return () => abortController.abort();
  }, [selectedFilter, fetchKpiAnalytics]);

  useEffect(() => {
    if (!showInfo) return;
    const handleClickOutside = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) setShowInfo(false);
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
    if (!kpiData || !Array.isArray(kpiData.topCustomers)) {
      return { safeCustomers: [], maxOrders: 1 };
    }

    const processed = kpiData.topCustomers
      .map(c => ({
        name: sanitizeCustomerName(c?.name),
        count: safeInt(c?.count)
      }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); 

    const max = processed.length > 0 ? processed[0].count : 1;
    const chartMax = Math.ceil(max * 1.1);

    return { safeCustomers: processed, maxOrders: chartMax };
  }, [kpiData]);

  return (
    <section 
      className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 relative h-full flex flex-col overflow-hidden"
      aria-labelledby="top-customers-title"
    >
      <div className="p-5 flex flex-col h-full overflow-hidden">
        
        {/* HEADER SECTION */}
        <header className="flex items-start justify-between gap-1 shrink-0 mb-4">
          <div className="flex flex-col gap-1 w-full pr-2">
            <div className="flex items-center gap-2">
              <h2 id="top-customers-title" className="text-sm-text mb-1 font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Top Customers
              </h2>
              
              <div className="relative" ref={infoRef}>
                <button 
                  onClick={toggleInfo}
                  className={`transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-app-dark/20 rounded-full ${showInfo ? 'text-app-dark' : 'text-text-dark/30 hover:text-text-dark/50'}`}
                  aria-label="Information about top customers"
                  aria-expanded={showInfo}
                >
                  <IconInfo className="w-4 h-4" aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {showInfo && (
                    <div 
                      role="tooltip"
                      className="absolute left-[-50px] top-7 w-56 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100] animate-in fade-in zoom-in-95 duration-200"
                    > 
                      <p className="text-sm-text font-normal text-text-dark/90 leading-relaxed">
                        A horizontal bar graph visualizing the order volume of your top 10 most frequent visitors securely fetched from historical data.
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* ✨ SECURE DROPDOWN WITH TAILWIND SVG */}
            <div className="relative mt-1 w-max min-w-[140px] z-[90]">
              <Listbox value={selectedFilter} onChange={setSelectedFilter} disabled={isLoading}>
                {({ open }) => (
                  <>
                    <ListboxButton className="relative w-full cursor-pointer bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 pl-3 pr-8 text-sm-text font-bold text-text-dark text-left hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/20 disabled:opacity-50">
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
                        <ListboxOptions
                          static
                          as={motion.ul}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-[100] mt-1.5 max-h-60 w-max min-w-full overflow-auto rounded-xl bg-white py-1 shadow-xl border border-slate-100 ring-1 ring-black/5 focus:outline-none isolate custom-scrollbar"
                        >
                          {TIME_FILTERS.map((option) => (
                            <ListboxOption
                              key={option.id}
                              value={option}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2.5 pl-3 pr-4 text-sm-text transition-colors ${
                                  active ? 'bg-app-dark/5 text-app-dark font-bold' : 'text-text-dark/80'
                                }`
                              }
                            >
                              <span className="block truncate">{option.label}</span>
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
          
          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0" aria-hidden="true">
            <IconAward className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </header>

        {/* ERROR BOUNDARY */}
        {error && !isLoading && (
          <div className="mt-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg text-center" role="alert">
            Failed to load customer data.
          </div>
        )}

        {/* CHART AREA */}
        <div 
          className="flex flex-col flex-1 relative overflow-y-auto custom-scrollbar min-h-[200px] pt-1"
          role="graphics-document"
          aria-label="Horizontal bar chart of top customers"
          aria-busy={isLoading}
        >
          {isLoading && <ChartRowSkeleton />}

          {!isLoading && safeCustomers.length > 0 && (
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
          )}
          
          {!isLoading && safeCustomers.length === 0 && !error && (
            <div className="py-12 flex flex-col items-center justify-center opacity-40 h-full">
              <IconAward className="w-8 h-8 mb-2" aria-hidden="true" />
              <p className="text-nano font-bold text-text-dark uppercase tracking-widest">No customer data found</p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}