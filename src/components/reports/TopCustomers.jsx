import { useMemo, useState, useEffect, useRef } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconAward, IconInfo } from "../icons";

export default function TopCustomers({ range }) {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  
  const orders = useReportStore(state => state.orders);
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

  const stats = useMemo(() => getAnalytics(range), [orders, range, getAnalytics]);
  const { topCustomers } = stats;

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 relative h-full flex flex-col">
      <div className="p-5 flex flex-col h-full">
        
        {/* Header Section - Fixed at top */}
        <div className="flex items-start justify-between gap-1  mb-4 shrink-0">
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-[13px] font-bold text-text-dark/70 truncate uppercase">
                Customer leaderboard
              </p>
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className="text-text-dark/30 hover:text-text-dark transition-colors"
              >
                <IconInfo className="w-4 h-4 text-gray-400 stroke-gray-400" />
              </button>

              {showInfo && (
                <div className="absolute left-0 top-6 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-50 animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[13px] text-text-dark/90 leading-relaxed">
                    This list identifies your top 10 most frequent visitors. Tt tracks how many successful orders each customer has placed within the selected timeframe.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
            <IconAward className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </div>

        {/* SCROLLABLE VIP List Container */}
        {/* max-h-[320px] ensures it fits nicely alongside your CustomerMix card */}
        <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
          <div className="space-y-1">
            {topCustomers.length > 0 ? (
              topCustomers.map((customer, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between py-2 group px-1 rounded-lg min-w-0 gap-2  transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="font-mono text-[10px] text-text-dark/60 w-4 shrink-0">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    
                    <div className="min-w-0 flex-1">
                      <p 
                        className="text-[16px] text-text-dark font-medium leading-tight uppercase truncate" 
                        title={customer.name}
                      >
                        {customer.name}
                      </p>
                      <p className="text-[12px] text-text-dark/70 tracking-tight truncate lowercase">
                        {customer.phone}
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-1 text-[13px] font-medium text-text-dark/90 shrink-0 whitespace-nowrap">
                    {customer.count} orders
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-[10px] text-text-dark/30 lowercase italic">no vip data available for this range</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}