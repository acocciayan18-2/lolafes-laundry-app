import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { useReportStore } from "../../store/reports/useReportStore";
import { IconInfo, IconPackage } from "../icons";

// ==========================================
// CONFIGURATION & CONSTANTS (Frozen)
// ==========================================
const RANGE_OPTIONS = Object.freeze([
  { id: '7', name: '7 Days' },
  { id: '30', name: '30 Days' },
  { id: 'year', name: '1 Year' },
]);

// Expanded palette to support up to 6 slices
const PIE_COLORS = Object.freeze([
  { stroke: "text-sky-400", bg: "bg-sky-400" },
  { stroke: "text-blue-500", bg: "bg-blue-500" },
  { stroke: "text-indigo-500", bg: "bg-indigo-500" },
  { stroke: "text-fuchsia-400", bg: "bg-fuchsia-400" },
  { stroke: "text-rose-400", bg: "bg-rose-400" },
  { stroke: "text-slate-300", bg: "bg-slate-300" } // Fallback for "Others"
]);

// ==========================================
// UTILITY HELPERS
// ==========================================
/**
 * @description Sanitizes and truncates strings to prevent XSS and layout breaking
 */
const sanitizeString = (str, maxLen = 30) => {
  if (!str || typeof str !== 'string') return "Unknown";
  return str.replace(/[<>]/g, '').trim().substring(0, maxLen);
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function PopularServices({ range: initialRange }) {
  // --- STATE & REFS ---
  const [showInfo, setShowInfo] = useState(false);
  const [activeRange, setActiveRange] = useState(initialRange || "7"); 
  const infoRef = useRef(null);
  
  const getServiceAnalytics = useReportStore(useCallback(state => state.getServiceAnalytics, []));
  const orders = useReportStore(state => state.orders);

  const selectedRangeOption = useMemo(() => 
    RANGE_OPTIONS.find(o => o.id === activeRange) || RANGE_OPTIONS[0], 
  [activeRange]);

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
    window.addEventListener("keydown", handleEsc);
    
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showInfo]);

  // --- DATA PROCESSING & FLAT PIE GEOMETRY MATH ---
  const { pieSegments } = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return { pieSegments: [], totalOrdersProcessed: 0 };

    try {
      const data = getServiceAnalytics(activeRange);
      if (!Array.isArray(data) || data.length === 0) return { pieSegments: [], totalOrdersProcessed: 0 };
      
      // 1. Sort descending and ensure valid numbers
      const sortedData = [...data]
        .map(s => ({
          ...s,
          name: sanitizeString(s.name, 40),
          count: Math.max(0, Math.floor(Number(s.count) || 0))
        }))
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count);

      // 2. Group into Top 5 + "Others" (Required for a mathematically sound pie chart)
      const top5 = sortedData.slice(0, 5);
      const remaining = sortedData.slice(5);
      const othersCount = remaining.reduce((sum, s) => sum + s.count, 0);

      const groupedData = [...top5];
      if (othersCount > 0) {
        groupedData.push({ name: "Other Services", count: othersCount });
      }

      const totalCount = groupedData.reduce((sum, s) => sum + s.count, 0);

      // 3. SVG Solid Pie Math
      // To make a solid pie chart (no donut hole), r must be 25 and strokeWidth 50 in a 100x100 viewBox.
      const radius = 25;
      const circumference = 2 * Math.PI * radius; // ~157.08
      
      let cumulativePercent = 0;
      const segments = groupedData.map((service, index) => {
        const relativePct = totalCount > 0 ? (service.count / totalCount) * 100 : 0;
        
        // Calculate dash array and offset for SVG rendering
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
      console.error("[PopularServices] Calculation failed:", err);
      return { pieSegments: [], totalOrdersProcessed: 0 };
    }
  }, [activeRange, getServiceAnalytics, orders]);

  return (
    <section 
      className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 overflow-hidden relative h-full flex flex-col"
      aria-labelledby="popular-services-title"
    >
      <div className="p-5 flex-1 flex flex-col">
        
        {/* HEADER SECTION */}
        <header className="flex items-start justify-between mb-4 shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 id="popular-services-title" className="text-sm-text mb-1 font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Service Distribution
              </h2>
              
              <div className="relative" ref={infoRef}>
                <button 
                  onClick={toggleInfo}
                  className={`transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-dark/20 rounded-full ${showInfo ? 'text-app-dark' : 'text-text-dark/30 hover:text-text-dark/50'}`}
                  aria-label="Information about top services"
                  aria-expanded={showInfo}
                >
                  <IconInfo className="w-4 h-4" aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {showInfo && (
                    <div 
                      role="tooltip"
                      className="absolute left-[-50px] top-7 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100] animate-in fade-in zoom-in-95 duration-200"
                    > 
                      <p className="text-sm-text text-text-dark/90 leading-relaxed">
                        Visualizes the market share of your services. Slices represent the percentage of total orders processed.
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* HEADLESS UI DROPDOWN */}
            <div className="relative mt-1 w-[100px] z-[90]">
              <Listbox value={selectedRangeOption} onChange={(opt) => setActiveRange(opt.id)}>
                {({ open }) => (
                  <>
                    <ListboxButton className="relative w-full cursor-pointer bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 pl-3 pr-8 text-sm-text font-bold text-text-dark text-left hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-app-dark/20">
                      <span className="block truncate  text-sm-text capitalize">{selectedRangeOption.name}</span>
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
                          {RANGE_OPTIONS.map((option) => (
                            <ListboxOption
                              key={option.id}
                              value={option}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2.5 pl-3 pr-3 text-sm-text  transition-colors ${
                                  active ? 'bg-app-dark/5 text-app-dark' : 'text-text-dark/80'
                                }`
                              }
                            >
                              {({ selected }) => (
                                <span className={`block truncate ${selected ? 'font-bold text-app-dark' : ''}`}>
                                  {option.name}
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
          
          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0" aria-hidden="true">
            <IconPackage className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </header>

        {/* ANALYTICS VISUALIZATION */}
        <div className="flex flex-col items-center justify-start flex-1 py-1 w-full">
          {pieSegments.length > 0 ? (
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
                       <span className="text-nano  text-text-dark/60 shrink-0">
                         {service.share.toFixed(1)}% ({service.count})
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-10 text-center flex flex-col items-center justify-center opacity-30 h-full" role="status">
              <IconPackage className="w-8 h-8 mb-2" aria-hidden="true" />
              <p className="text-nano font-bold uppercase tracking-widest">No data available</p>
            </div>
          )}
        </div>

      </div>

      {/* FOOTER METADATA */}
      <footer className="mx-5 mb-4 mt-auto border-t border-slate-50 pt-3 flex justify-between items-center">
        <p className="text-nano font-bold text-text-dark/40 uppercase">
          {activeRange === 'year' ? 'Annual Overview' : `Insights from last ${activeRange} days`}
        </p>
      </footer>
    </section>
  );
}