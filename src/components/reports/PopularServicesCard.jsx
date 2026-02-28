import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconInfo, IconPackage } from "../icons";

export default function PopularServices({ range: initialRange }) {
  const [showInfo, setShowInfo] = useState(false);
  const [activeRange, setActiveRange] = useState(initialRange || "7"); 
  const infoRef = useRef(null);
  
  // 1. Removed 'orders' from destructuring to fix the warning
  // The hook already tracks changes to the store internally.
  const { getServiceAnalytics } = useReportStore();

  // 2. The dependency on 'getServiceAnalytics' is enough to trigger 
  // a recalculation if your store is set up to return a new function 
  // or update state correctly.
  const services = useMemo(() => 
    getServiceAnalytics(activeRange), 
    [activeRange, getServiceAnalytics]
  );

  const topThree = services.filter(s => s.rank <= 3);

  useEffect(() => {
    function handleClickOutside(event) {
      if (infoRef.current && !infoRef.current.contains(event.target)) setShowInfo(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 overflow-hidden relative">
      <div className="p-5">
        
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] mb-1 font-bold text-text-dark/70 truncate uppercase">Top Services</h2>
              
              <div className="relative" ref={infoRef}>
                <button 
                  onClick={() => setShowInfo(!showInfo)}
                  className="text-text-dark/30 transition-colors"
                >
                  <IconInfo className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showInfo && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-[-100px] top-full mt-2 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]"
                    > 
                      <p className="text-[13px] text-text-dark/90 leading-relaxed ">
                        Tracks the Operational Load. The bar represents the percentage of total orders this service accounts for.
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
          {topThree.map((service) => (
            <div key={service.name} className="relative">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black border ${
                    service.rank === 1 ? 'bg-app-dark/10 text-app-dark/90 border-app-dark/20' : 
                    service.rank === 2 ? 'bg-app-dark/10 text-app-dark/90 border-app-dark/20' : 
                    'bg-app-dark/10 text-app-dark border-app-dark/20'
                  }`}>
                    0{service.rank}
                  </span>
                  <div>
                    <h4 className="text-sm-text font-bold text-text-dark leading-none">{service.name}</h4>
                    <p className="text-nano font-bold text-text-dark/70 mt-1 ">
                      {service.count} Orders
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-sm-text font-bold text-text-dark`}>
                    {service.share.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="h-1.5 w-full bg-slate-50 rounded-full border border-slate-100/50 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${service.share}%` }}
                  transition={{ duration: 1.2, ease: "circOut" }}
                  className="h-full rounded-full bg-app-dark/90"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-50 flex justify-between items-center">
          <p className="text-[9px] font-bold text-text-dark/40 uppercase pt-2">
            {activeRange === 'year' ? 'Annual Overview' : `Insights from last ${activeRange} days`}
          </p>
        </div>
      </div>
    </div>
  );
}