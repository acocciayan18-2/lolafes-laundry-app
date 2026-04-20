import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconDollarSign, IconInfo, IconPackage, IconTrendingUp, IconZap } from "../icons";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';

// ==========================================
// 🛡️ CONSTANTS & DYNAMIC GENERATORS
// ==========================================

const generateDateFilters = () => {
  const currentYear = new Date().getFullYear();
  const baseYear = 2026; // ✨ SYSTEM CREATION YEAR
  
  const filters = [
    { id: "today", label: "Today", payload: { range: "today", value: 0 } }, 
    { id: "7_days", label: "Last 7 Days", payload: { range: "days", value: 7 } },
    { id: "30_days", label: "Last 30 Days", payload: { range: "days", value: 30 } },
  ];

  // ✨ Auto-generate past years dynamically starting from baseYear
  for (let y = currentYear; y >= baseYear; y--) {
    filters.push({ 
      id: `year_${y}`, 
      label: y === currentYear ? `This Year (${y})` : `Year ${y}`, 
      payload: { range: "year", value: y } 
    });
  }

  return filters;
};

const FILTER_OPTIONS = Object.freeze(generateDateFilters());

// ==========================================
// 🛡️ DEFENSIVE FORMATTING UTILITIES
// ==========================================

const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num) || num == null) return "₱0"; 
  return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const formatDuration = (hours) => {
  const num = Number(hours);
  if (isNaN(num) || num <= 0) return "0s";
  
  const totalSeconds = Math.max(0, Math.round(num * 3600)); 
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// ==========================================
// 🧩 ATOMIC COMPONENTS
// ==========================================

const KpiCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-md border border-app-dark/10 p-4 animate-pulse" aria-hidden="true">
    <div className="h-3 bg-slate-200 rounded w-1/2 mb-3"></div>
    <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
    <div className="h-3 bg-slate-200 rounded w-1/3"></div>
  </div>
);

const KpiCard = memo(({ label, value, icon, trend, isLoading }) => {
  if (isLoading) return <KpiCardSkeleton />;

  return (
    <article className="bg-white rounded-xl shadow-md border border-app-dark/10 overflow-hidden focus-within:ring-2 focus-within:ring-app-dark/20 transition-all">
      <div className="p-4">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <h3 className="text-micro text-text-dark/70 mb-1 pb-0.5 truncate">{label}</h3>
            <p className="text-h1 md:text-h1 font-bold text-text-dark leading-tight pb-1 truncate tracking-tighter cursor-default" title={String(value)} aria-label={`${label}: ${value}`}>
              {value}
            </p>
            <p className="text-micro text-text-dark/60 mt-2 pb-0.5 truncate">{trend}</p>
          </div>
          <div className="p-2 md:p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0" aria-hidden="true">
            {React.cloneElement(icon, { className: `w-4 h-4 md:w-5 md:h-5 ${icon.props.className}` })}
          </div>
        </div>
      </div>
    </article>
  );
});

// ==========================================
// 🚀 MAIN COMPONENT
// ==========================================

export default function KpiCards() {
  const [selectedFilter, setSelectedFilter] = useState(FILTER_OPTIONS[0]);
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);

  // Zustand Selectors
  const fetchKpiAnalytics = useReportStore(state => state.fetchKpiAnalytics);
  const stats = useReportStore(state => state.kpiData);
  const isLoading = useReportStore(state => state.isKpiLoading);
  const error = useReportStore(state => state.kpiError);
  
  // ✨ FIX: Extract orders array to listen for background Firebase updates
  const orders = useReportStore(state => state.orders);

  // Server-Side Fetching Trigger & Live Sync
  useEffect(() => {
    const abortController = new AbortController();
    
    // ✨ FIX: Re-calculate the analytics whenever the selected filter changes OR new orders arrive from the database.
    fetchKpiAnalytics(selectedFilter.payload, abortController.signal);
    
    return () => abortController.abort(); 
  }, [selectedFilter, fetchKpiAnalytics, orders]);

  // Click-Outside Listener for Tooltip
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    };
    
    if (showInfo) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", (e) => e.key === "Escape" && setShowInfo(false));
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", (e) => e.key === "Escape" && setShowInfo(false));
    };
  }, [showInfo]);

  const kpiItems = useMemo(() => [
    { label: "Total Profit", value: formatCurrency(stats?.totalProfit), icon: <IconDollarSign className="text-emerald-600 stroke-emerald-600" />, trend: "Net earnings" },
    { label: "Orders Volume", value: Number(stats?.totalOrders || 0).toLocaleString(), icon: <IconPackage className="text-blue-600 stroke-blue-600" />, trend: "Total loads" },
    { label: "Avg Order Value", value: formatCurrency(stats?.aov), icon: <IconTrendingUp className="text-amber-600 stroke-amber-600" />, trend: "Per customer" },
    { label: "Avg Turnaround", value: formatDuration(stats?.avgTat), icon: <IconZap className="text-violet-600 stroke-violet-600" />, trend: "Processing speed" },
  ], [stats]);

  return (
    <section aria-labelledby="kpi-heading" className="space-y-3">
      <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
      
      <header className="flex justify-start items-center ">
        <div className="relative w-auto z-40">
          <Listbox value={selectedFilter} onChange={setSelectedFilter} disabled={isLoading}>
            {({ open }) => (
              <>
                <ListboxButton 
                  className="relative w-full cursor-pointer bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 pl-3 pr-10 text-sm-text text-text-dark text-left hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
                  aria-label={`Filter analytics by ${selectedFilter.label}`}
                >
                  <span className="block truncate">{selectedFilter.label}</span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className={`w-4 h-4 text-text-dark/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
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
                      className="absolute mt-1.5 max-h-60 w-max min-w-full overflow-auto rounded-xl bg-white shadow-lg border border-slate-100 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    >
                      {FILTER_OPTIONS.map((opt) => (
                        <ListboxOption
                          key={opt.id}
                          className={({ active }) => `relative cursor-pointer select-none py-2.5 px-4 text-sm-text transition-colors ${active ? 'bg-app-dark/5 text-app-dark font-bold' : 'text-text-dark/80'}`}
                          value={opt}
                        >
                          <span className="block truncate">{opt.label}</span>
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  )}
                </AnimatePresence>
              </>
            )}
          </Listbox>
        </div>

        <div className="relative flex items-center" ref={infoRef}>
          <button 
            onClick={() => setShowInfo(!showInfo)} 
            className="p-2 text-text-dark/30 hover:text-text-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/20 rounded-full"
            aria-label="Analytics information"
            aria-expanded={showInfo}
          >
            <IconInfo className="w-4 h-4 text-gray-400 stroke-gray-400" aria-hidden="true" />
          </button>
          
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute left-0 top-9 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]"
                role="tooltip"
              >
                <p className="text-sm-text font-normal text-text-dark/90 leading-relaxed">
                  Summarized shop health metrics including profit, load volume, and speed. Sourced securely from backend records.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ERROR BOUNDARY UI */}
      {error && !isLoading && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg text-center" role="alert">
          Unable to load analytics. Please check your connection.
        </div>
      )}

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiItems.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} isLoading={isLoading} />
        ))}
      </div>
    </section>
  );
}