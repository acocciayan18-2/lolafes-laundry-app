import { useEffect, useMemo, useRef, useState } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconDollarSign, IconInfo, IconPackage, IconTrendingUp, IconZap } from "../icons";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'; // ✨ Updated v2.0 Imports
import { AnimatePresence, motion } from 'framer-motion';

const FILTER_OPTIONS = [
  { label: "7 Days", value: "7" },
  { label: "30 Days", value: "30" },
  { label: "1 Year", value: "365" },
];

export default function KpiCards() {
  const [selectedOption, setSelectedOption] = useState(FILTER_OPTIONS[0]);
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  
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

  const stats = useMemo(() => getAnalytics(selectedOption.value), [selectedOption.value, getAnalytics]);
  const { totalRevenue, totalOrders, aov, avgTat } = stats;

  const formatDuration = (hours) => {
    if (!hours || hours === 0) return "0s";
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const items = [
    { label: "Total Sales", value: `₱${Math.round(totalRevenue).toLocaleString()}`, icon: <IconDollarSign className="text-emerald-600 stroke-emerald-600" />, trend: "Gross earnings" },
    { label: "Orders Volume", value: totalOrders.toLocaleString(), icon: <IconPackage className="text-blue-600 stroke-blue-600" />, trend: "Total loads" },
    { label: "Avg Order Value", value: `₱${Math.round(aov).toLocaleString()}`, icon: <IconTrendingUp className="text-amber-600 stroke-amber-600" />, trend: "Per customer" },
    { label: "Avg Turnaround", value: formatDuration(avgTat), icon: <IconZap className="text-violet-600 stroke-violet-600" />, trend: "Processing speed" },
  ];

  return (
    <div className="space-y-3 mt-2">
      <div className="flex justify-start items-center pt-2 gap-2">
        
        <div className="relative w-auto z-50">
          <Listbox value={selectedOption} onChange={setSelectedOption}>
            {({ open }) => (
              <>
                <ListboxButton className="relative w-full cursor-pointer bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 pl-3 pr-10 text-[13px] font-bold text-text-dark text-left hover:bg-slate-50 transition-colors focus:outline-none">
                  <span className="block truncate font-medium">{selectedOption.label}</span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className={`w-4 h-4 text-text-dark/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="absolute mt-1.5 max-h-60 w-full overflow-auto rounded-xl bg-white  shadow-lg border border-slate-100 ring-1 ring-black ring-opacity-5 focus:outline-none"
                    >
                      {FILTER_OPTIONS.map((opt) => (
                        <ListboxOption
                          key={opt.value}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2.5 pl-4 pr-4 text-sm-text font-medium transition-colors ${
                              active ? 'bg-app-dark/5 text-app-dark' : 'text-text-dark/80'
                            }`
                          }
                          value={opt}
                        >
                          {({ selected }) => (
                            <span className={`block truncate ${selected ? 'font-bold text-app-dark' : 'font-medium'}`}>
                              {opt.label}
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

        <div className="relative flex items-center" ref={infoRef}>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 text-text-dark/30 hover:text-text-dark transition-colors">
            <IconInfo className="w-4 h-4 text-gray-400 stroke-gray-400" />
          </button>
          <AnimatePresence>
            {showInfo && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute left-0 top-9 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]"
              >
                <p className="text-[13px] text-text-dark/90 leading-relaxed">
                  Summarized shop health metrics including revenue, load volume, and speed.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  {items.map((kpi, i) => (
    <div key={i} className="bg-white rounded-xl shadow-md border border-app-dark/10 overflow-hidden">
      <div className="p-4 ">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            {/* ✨ FIX: Added pb-0.5 to prevent bottom clipping */}
            <p className="text-micro font-medium text-text-dark/70 mb-1 pb-0.5 truncate">
              {kpi.label}
            </p>
            
            <p className="text-h1 md:text-h1 font-bold text-text-dark leading-tight pb-1 truncate tracking-tighter cursor-default" title={kpi.value}>
              {kpi.value}
            </p>
            
            <p className="text-micro font-medium text-text-dark/60 mt-2 pb-0.5 truncate">
              {kpi.trend}
            </p>
          </div>
          
          <div className="p-2 md:p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
            {require('react').cloneElement(kpi.icon, { 
              className: "w-4 h-4 md:w-5 md:h-5 " + kpi.icon.props.className
            })}
          </div>
        </div>
      </div>
    </div>
  ))}
</div>
    </div>
  );
}