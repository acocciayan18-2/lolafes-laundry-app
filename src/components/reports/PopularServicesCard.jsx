import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { useReportStore } from "../../store/reports/useReportStore";
import { IconInfo, IconPackage,  } from "../icons";

const RANGE_OPTIONS = [
  { id: '7', name: '7 Days' },
  { id: '30', name: '30 Days' },
  { id: 'year', name: '1 Year' },
];

export default function PopularServices({ range: initialRange }) {
  const [showInfo, setShowInfo] = useState(false);
  const [activeRange, setActiveRange] = useState(initialRange || "7"); 
  const infoRef = useRef(null);
  
  const getServiceAnalytics = useReportStore((state) => state.getServiceAnalytics);
  const orders = useReportStore((state) => state.orders);

  const selectedRangeOption = RANGE_OPTIONS.find(o => o.id === activeRange) || RANGE_OPTIONS[0];

  const safeServices = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];

    try {
      const data = getServiceAnalytics(activeRange);
      
      if (!Array.isArray(data)) return [];
      
      return data
        .map(s => ({
          ...s,
          name: s.name || "Unknown Service",
          count: Number(s.count) || 0,
          share: Number(s.share) || 0,
          rank: s.rank || 99
        }))
        .filter(s => s.rank <= 3);

    } catch (err) {
      console.error("PopularServices calculation failed:", err);
      return [];
    }
  }, [activeRange, getServiceAnalytics, orders]);

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

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showInfo]);

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 overflow-hidden relative">
      <div className="p-5">
        
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] mb-1 font-bold text-text-dark/70 truncate uppercase tracking-tight">Top Services</h2>
              
              <div className="relative" ref={infoRef}>
                <button 
                  onClick={() => setShowInfo(!showInfo)}
                  className={`transition-colors ${showInfo ? 'text-app-dark' : 'text-text-dark/30 hover:text-text-dark/50'}`}
                  aria-label="Toggle information"
                >
                  <IconInfo className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showInfo && (
                    <div className="absolute left-[-50px] top-7 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100] animate-in fade-in zoom-in-95 duration-200"> 
                      <p className="text-[13px] text-text-dark/90 leading-relaxed">
                        Tracks the Operational Load. The bar represents the percentage of total orders this service accounts for in the selected period.
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* ✨ HEADLESS UI DROPDOWN */}
            <div className="relative mt-1 w-[100px] z-[90]">
              <Listbox value={selectedRangeOption} onChange={(opt) => setActiveRange(opt.id)}>
                {({ open }) => (
                  <>
                    <ListboxButton className="relative w-full cursor-pointer bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 pl-3 pr-8 text-[13px] font-bold text-text-dark text-left hover:bg-slate-50 transition-colors focus:outline-none">
                      <span className="block truncate font-medium text-sm-text capitalize">{selectedRangeOption.name}</span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
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
                          className="absolute mt-1.5 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-xl border border-slate-100 ring-1 ring-black ring-opacity-5 focus:outline-none"
                        >
                          {RANGE_OPTIONS.map((option) => (
                            <ListboxOption
                              key={option.id}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2.5 pl-3 pr-3 text-[13px] font-medium transition-colors ${
                                  active ? 'bg-app-dark/5 text-app-dark' : 'text-text-dark/80'
                                }`
                              }
                              value={option}
                            >
                              {({ selected }) => (
                            <span className={`block truncate ${selected ? 'font-bold text-app-dark' : 'font-medium'}`}>
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

          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
            <IconPackage className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </div>

        <div className="space-y-7 mt-4">
          {safeServices.length > 0 ? safeServices.map((service) => (
            <div key={service.name} className="relative">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg text-micro font-bold border bg-app-dark/5 text-app-dark/90 border-app-dark/10">
                    {service.rank}
                  </span>
                  <div>
                    <h4 className="text-sm-text font-bold text-text-dark leading-none truncate max-w-[200px]">
                      {service.name}
                    </h4>
                    <p className="text-nano font-bold text-text-dark/50 mt-1 ">
                      {service.count} {service.count === 1 ? 'Order' : 'Orders'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm-text font-bold text-text-dark">
                    {service.share.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="h-2 w-full bg-slate-50 rounded-full border border-slate-100 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${service.share}%` }}
                  transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }} 
                  className="h-full rounded-full bg-app-dark"
                />
              </div>
            </div>
          )) : (
            <div className="py-10 text-center flex flex-col items-center justify-center opacity-30">
              <IconPackage className="w-8 h-8 mb-2" />
              <p className="text-nano font-bold uppercase tracking-widest">No data available</p>
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-slate-50 pt-2 flex justify-between items-center">
          <p className="text-[9px] font-bold text-text-dark/40 uppercase">
            {activeRange === 'year' ? 'Annual Overview' : `Insights from last ${activeRange} days`}
          </p>
          {safeServices.length > 0 && (
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Data" />
          )}
        </div>
      </div>
    </div>
  );
}