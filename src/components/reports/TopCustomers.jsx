import { useEffect, useMemo, useRef, useState } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconAward, IconInfo } from "../icons";

export default function TopCustomers({ range }) {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  
  // FIX: Removed 'orders' assignment as it was causing a "no-unused-vars" error
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

  /* FIX: Removed 'orders' from the dependency array to satisfy ESLint.
     React only needs to re-calculate when 'range' or 'getAnalytics' changes.
  */
  const stats = useMemo(() => getAnalytics(range), [range, getAnalytics]);
  const { topCustomers } = stats;

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 relative h-full flex flex-col">
      <div className="p-5 flex flex-col h-full">
        
        {/* Header Section */}
        <div className="flex items-start justify-between gap-1  shrink-0">
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            <div className="flex items-center gap-1.5 mb-1">
              {/* LABEL: text-micro (11px) with tracking-widest */}
              <p className="text-[13px] font-bold text-text-dark/70 truncate  uppercase mr-2">
                Customer leaderboard
              </p>
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className="text-text-dark/30 hover:text-text-dark transition-colors"
              >
                <IconInfo className="w-4 h-4 text-gray-400 stroke-gray-400" />
              </button>

              {showInfo && (
                <div className="absolute left-0 top-8 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-50 animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-sm-text text-text-dark/90 leading-relaxed">
                    This list identifies your top 10 most frequent visitors. It tracks how many successful orders each customer has placed within the selected timeframe.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
            <IconAward className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </div>

        {/* SCROLLABLE VIP List */}
        <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
          <div className="space-y-1">
            {topCustomers.length > 0 ? (
              topCustomers.map((customer, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between py-2 group px-1 rounded-lg min-w-0 gap-2"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* RANK: text-nano (10px) */}
                    <span className=" text-micro font-medium text-text-dark/50 w-4 shrink-0">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    
                    <div className="min-w-0 flex-1">
                      {/* NAME: text-base-text (15px) */}
                      <p 
                        className="text-base-text text-text-dark font-bold leading-tight truncate " 
                        title={customer.name}
                      >
                        {customer.name}
                      </p>
                     
                    </div>
                  </div>

                  {/* COUNT: text-sm-text (13px) */}
                  <div className="px-3 py-1 text-micro font-medium text-text-dark/80 shrink-0 whitespace-nowrap">
                    {customer.count} orders
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-nano font-bold text-text-dark/30 uppercase tracking-widest italic">no vip data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}