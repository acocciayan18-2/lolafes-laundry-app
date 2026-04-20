import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { useReportStore } from "../../store/reports/useReportStore";
import { IconInfo, IconPackage } from "../icons";

// ==========================================
// 🛡️ DYNAMIC CONFIGURATION
// ==========================================
// Generates past years dynamically so the app doesn't break when the year changes
const generateTimeFilters = () => {
  const currentYear = new Date().getFullYear();
  return [
    { id: "7_days", label: "Last 7 Days", payload: { range: "days", value: 7 } },
    { id: "30_days", label: "Last 30 Days", payload: { range: "days", value: 30 } },
    { id: `year_${currentYear}`, label: `This Year (${currentYear})`, payload: { range: "year", value: currentYear } },
    { id: `year_${currentYear - 1}`, label: `Last Year (${currentYear - 1})`, payload: { range: "year", value: currentYear - 1 } },
    { id: `year_${currentYear - 2}`, label: `Year ${currentYear - 2}`, payload: { range: "year", value: currentYear - 2 } }
  ];
};

const TIME_FILTERS = Object.freeze(generateTimeFilters());

const PIE_COLORS = Object.freeze([
  { stroke: "text-sky-400", bg: "bg-sky-400" },
  { stroke: "text-blue-500", bg: "bg-blue-500" },
  { stroke: "text-indigo-500", bg: "bg-indigo-500" },
  { stroke: "text-fuchsia-400", bg: "bg-fuchsia-400" },
  { stroke: "text-rose-400", bg: "bg-rose-400" },
  { stroke: "text-slate-300", bg: "bg-slate-300" } 
]);

// ==========================================
// 🛡️ DEFENSIVE UTILITIES
// ==========================================
const sanitizeString = (str, maxLen = 30) => {
  if (!str || typeof str !== 'string') return "Unknown";
  return str.replace(/[<>]/g, '').trim().substring(0, maxLen);
};

// ==========================================
// 🧩 ATOMIC COMPONENTS
// ==========================================
const PieSkeleton = () => (
  <div className="flex flex-col items-center justify-center w-full h-full animate-pulse" aria-hidden="true">
    <div className="w-40 h-40 bg-slate-200 rounded-full mb-6 mt-2"></div>
    <div className="grid grid-cols-2 gap-4 w-full px-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-200 rounded-sm shrink-0"></div>
          <div className="h-3 bg-slate-200 rounded w-full"></div>
        </div>
      ))}
    </div>
  </div>
);

// ==========================================
// 🚀 MAIN COMPONENT
// ==========================================
export default function PopularServices() {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(TIME_FILTERS[0]); 
  const infoRef = useRef(null);
  
  // Zustand Async Selectors
  const fetchServiceAnalytics = useReportStore(state => state.fetchServiceAnalytics);
  const rawServiceData = useReportStore(state => state.serviceAnalyticsData);
  const isLoading = useReportStore(state => state.isServiceLoading);
  const error = useReportStore(state => state.serviceError);

  // --- EVENT HANDLERS ---
  const toggleInfo = useCallback(() => setShowInfo(prev => !prev), []);

  // ✨ QA RESILIENCE: Server-Side Fetching Trigger with Abort Controller
  useEffect(() => {
    const abortController = new AbortController();
    if (typeof fetchServiceAnalytics === 'function') {
      fetchServiceAnalytics(selectedFilter.payload, abortController.signal);
    }
    return () => abortController.abort();
  }, [selectedFilter, fetchServiceAnalytics]);

  useEffect(() => {
    if (!showInfo) return; 
    const handleClickOutside = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) setShowInfo(false);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowInfo(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showInfo]);

  // --- DATA PROCESSING & FLAT PIE GEOMETRY MATH ---
  const { pieSegments, totalOrdersProcessed } = useMemo(() => {
    if (!rawServiceData || !Array.isArray(rawServiceData) || rawServiceData.length === 0) {
      return { pieSegments: [], totalOrdersProcessed: 0 };
    }

    try {
      // 1. Sanitize, ensure valid numbers, and sort descending
      const sortedData = [...rawServiceData]
        .map(s => ({
          ...s,
          name: sanitizeString(s.name, 40),
          count: Math.max(0, Math.floor(Number(s.count) || 0))
        }))
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count);

      // 2. Group into Top 5 + "Others"
      const top5 = sortedData.slice(0, 5);
      const remaining = sortedData.slice(5);
      const othersCount = remaining.reduce((sum, s) => sum + s.count, 0);

      const groupedData = [...top5];
      if (othersCount > 0) {
        groupedData.push({ name: "Other Services", count: othersCount });
      }

      const totalCount = groupedData.reduce((sum, s) => sum + s.count, 0);

      // 3. SVG Solid Pie Math
      const radius = 25;
      const circumference = 2 * Math.PI * radius; 
      
      let cumulativePercent = 0;
      const segments = groupedData.map((service, index) => {
        const relativePct = totalCount > 0 ? (service.count / totalCount) * 100 : 0;
        
        const dashLength = (relativePct / 100) * circumference;
        const strokeDasharray = `${dashLength} ${circumference}`;
        const strokeDashoffset = -((cumulativePercent / 100) * circumference);
        
        cumulativePercent += relativePct;

        return {
          ...service,
          colorTheme: PIE_COLORS[index % PIE_COLORS.length],
          share: relativePct,
          strokeDasharray,
          strokeDashoffset
        };
      });

      return { pieSegments: segments, totalOrdersProcessed: totalCount };

    } catch (err) {
      console.error("[PopularServices] Math Error:", err);
      return { pieSegments: [], totalOrdersProcessed: 0 };
    }
  }, [rawServiceData]);

  return (
    <section 
      className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 overflow-hidden relative h-full flex flex-col"
      aria-labelledby="popular-services-title"
    >
      <div className="p-5 flex-1 flex flex-col">
        
        {/* HEADER SECTION */}
        <header className="flex items-start justify-between mb-4 shrink-0">
          <div className="flex flex-col gap-1 w-full pr-2">
            <div className="flex items-center gap-2">
              <h2 id="popular-services-title" className="text-sm-text mb-1 font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Popular Services
              </h2>
              
              <div className="relative" ref={infoRef}>
                <button 
                  onClick={toggleInfo}
                  className={`transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-app-dark/20 rounded-full ${showInfo ? 'text-app-dark' : 'text-text-dark/30 hover:text-text-dark/50'}`}
                  aria-label="Information about top services"
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
                        Visualizes the market share of your services based on securely fetched historical records.
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
                          className="absolute z-[100] mt-1.5 max-h-60 w-max min-w-full overflow-auto rounded-xl bg-white py-1 shadow-xl border border-slate-100 ring-1 ring-black/5 focus:outline-none isolate"
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
            <IconPackage className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </header>

        {/* ERROR BOUNDARY */}
        {error && !isLoading && (
          <div className="mt-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg text-center" role="alert">
            Failed to load service data.
          </div>
        )}

        {/* ANALYTICS VISUALIZATION */}
        <div className="flex flex-col items-center justify-start flex-1 py-1 w-full relative" aria-busy={isLoading}>
          
          {isLoading && <PieSkeleton />}

          {!isLoading && pieSegments.length > 0 && (
            <>
              {/* FLAT SVG PIE CHART */}
              <div className="relative flex items-center justify-center w-40 h-40 mb-4 mt-2 shrink-0" aria-hidden="true">
                <svg 
                  className="w-full h-full transform -rotate-90 rounded-full shadow-sm" 
                  viewBox="0 0 100 100"
                >
                  {pieSegments.map((segment) => (
                    <circle 
                      key={segment.name}
                      cx="50" cy="50" r="25" 
                      fill="transparent" 
                      className={`${segment.colorTheme.stroke} transition-all duration-1000 ease-out`} 
                      stroke="currentColor" 
                      strokeWidth="50"
                      strokeDasharray={segment.strokeDasharray}
                      strokeDashoffset={segment.strokeDashoffset}
                    />
                  ))}
                </svg>
              </div>

              {/* GRID LEGEND */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 w-full mt-auto pt-2" role="list">
                {pieSegments.map((service) => (
                  <div key={service.name} role="listitem" className="flex items-center gap-2 min-w-0">
                    <span className={`w-3 h-3 rounded-sm shrink-0 shadow-sm ${service.colorTheme.bg}`} aria-hidden="true" />
                    <div className="flex flex-col min-w-0">
                       <span className="text-micro font-bold text-text-dark truncate leading-tight" title={service.name}>
                         {service.name}
                       </span>
                       <span className="text-micro text-text-dark/70 shrink-0">
                         {service.share.toFixed(1)}% ({service.count})
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!isLoading && pieSegments.length === 0 && !error && (
            <div className="py-10 text-center flex flex-col items-center justify-center opacity-30 h-full" role="status">
              <IconPackage className="w-8 h-8 mb-2" aria-hidden="true" />
              <p className="text-nano font-bold uppercase tracking-widest">No data available</p>
            </div>
          )}
        </div>

      </div>

      <footer className="mx-5 mb-4 mt-auto border-t border-slate-50 pt-3 flex justify-between items-center">
        <p className="text-nano font-bold text-text-dark/40 uppercase" aria-live="polite">
          {selectedFilter.payload.range === 'year' 
            ? `Insights for ${selectedFilter.payload.value}` 
            : `Insights from last ${selectedFilter.payload.value} days`}
        </p>
        
        {/* ✨ FIX: We are now using the variable to show total volume! */}
        {!isLoading && totalOrdersProcessed > 0 && (
          <p className="text-nano font-bold text-app-dark uppercase tracking-tight">
            {totalOrdersProcessed} Total Units
          </p>
        )}
      </footer>
    </section>
  );
}