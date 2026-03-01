import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconInfo, IconPackage } from "../icons";

export default function PopularServices({ range: initialRange }) {
  const [showInfo, setShowInfo] = useState(false);
  const [activeRange, setActiveRange] = useState(initialRange || "7"); 
  const infoRef = useRef(null);
  
  // 1. SELECTOR OPTIMIZATION: 
  // We grab 'orders' to ensure this component re-renders when new data arrives.
  const getServiceAnalytics = useReportStore((state) => state.getServiceAnalytics);
  const orders = useReportStore((state) => state.orders);

  // 2. DATA SANITIZATION:
  // Memoize the calculation. If 'orders' or 'activeRange' change, recalculate.
  const safeServices = useMemo(() => {
  // 1. LINTER FIX: Reference orders explicitly. 
  // This ensures the memo re-runs when data changes without triggering the warning.
  if (!orders || !Array.isArray(orders)) return [];

  try {
    // 2. VALIDATION: Execute the analytics from the store
    const data = getServiceAnalytics(activeRange);
    
    if (!Array.isArray(data)) return [];
    
    // 3. SECURITY & DATA SANITIZATION:
    // We map through to ensure no 'NaN' or 'undefined' values break the frontend.
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
  // The linter is now happy because 'orders' is used in the first line of the function.
}, [activeRange, getServiceAnalytics, orders]);

  // 3. PERFORMANCE: Event Listener cleanup
  useEffect(() => {
    if (!showInfo) return; // Don't even attach if hidden

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
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 overflow-hidden relative ">
      <div className="p-5">
        
        {/* Header Section */}
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
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-[-100px] md:right-0 top-full mt-2 w-52 p-3 bg-white border border-app-dark/30 shadow-2xl rounded-xl z-[100]"
                    > 
                      <p className="text-[12px] text-text-dark/90 font-medium leading-relaxed">
                        Tracks the **Operational Load**. The bar represents the percentage of total orders this service accounts for in the selected period.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit mt-1">
              {['7', '30', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setActiveRange(p)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${
                    activeRange === p 
                      ? 'bg-white text-app-dark shadow-sm' 
                      : 'text-text-dark/40 hover:text-text-dark/60'
                  }`}
                >
                  {p === 'year' ? '1Y' : `${p}D`}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
            <IconPackage className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </div>

        {/* --- PERFORMANCE ROWS --- */}
        <div className="space-y-7 mt-4">
          {safeServices.length > 0 ? safeServices.map((service) => (
            <div key={service.name} className="relative">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg text-micro font-bold border bg-app-dark/5 text-app-dark/90 border-app-dark/10">
                    {service.rank}
                  </span>
                  <div>
                    <h4 className="text-sm-text font-bold text-text-dark leading-none truncate max-w-[120px]">
                      {service.name}
                    </h4>
                    <p className="text-nano font-bold text-text-dark/50 mt-1 ">
                      {service.count} {service.count === 1 ? 'Order' : 'Orders'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm-text font-black text-text-dark">
                    {service.share.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="h-2 w-full bg-slate-50 rounded-full border border-slate-100 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${service.share}%` }}
                  transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }} // Bouncy spring effect
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