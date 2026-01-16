import { useMemo, useState, useEffect, useRef } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconTrendingUp, IconInfo } from "../icons";

export default function SalesPerformance() {
  const [range, setRange] = useState("day");
  const [showInfo, setShowInfo] = useState(false);
  const [activeBar, setActiveBar] = useState(null); 
  const infoRef = useRef(null);
  const containerRef = useRef(null);
  
  const orders = useReportStore(state => state.orders);
  const getSalesTrend = useReportStore(state => state.getSalesTrend);

  useEffect(() => {
    function handleClickOutside(event) {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActiveBar(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chartData = useMemo(() => getSalesTrend(range), [orders, range, getSalesTrend]);
  
  const maxVal = useMemo(() => {
    const values = chartData.map(d => d.value);
    const peak = Math.max(...values);
    return peak > 0 ? peak : 1000; 
  }, [chartData]);

  const totalInPeriod = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 h-full relative overflow-visible" ref={containerRef}>
      <div className="p-5 overflow-visible">
        
        {/* Header Section */}
        <div className="flex gap-1">
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            <div className="flex items-start">
              <p className="text-[13px] font-bold text-text-dark/70 truncate  uppercase mr-2">Revenue analysis</p>
              <button onClick={() => setShowInfo(!showInfo)} className="text-text-dark/40 hover:text-text-dark transition-colors">
                 <IconInfo className="w-4 h-4 text-gray-400 stroke-gray-400" />
              </button>
              {showInfo && (
                <div className="absolute left-0 top-6 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100] animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[13px] text-text-dark/90 leading-relaxed">
                    This chart automatically scales so your highest sales peak always reaches the top.
                  </p>
                </div>
              )}
            </div>
           
          </div>
          <div className="p-2.5 rounded-lg border border-app-dark/10 shadow-hollow shrink-0">
            <IconTrendingUp className="w-4 h-4 text-text-dark/90 stroke-text-dark/90" />
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex gap-1 ">
          {['day', 'week', 'month', 'year'].map((f) => (
            <button
              key={f}
              onClick={() => {
                setRange(f);
                setActiveBar(null);
              }}
              className={`px-3 py-1 rounded-full text-[12px] transition-all capitalize ${
                range === f ? 'bg-btn-primary text-white' : 'bg-app-dark/10 text-text-dark/80 hover:bg-app-dark/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Chart Layout */}
        <div className="flex gap-2 h-52 overflow-visible">
          
          {/* FIXED Y-Axis Labels */}
          <div className="flex flex-col justify-between h-40 pb-6 text-[9px] text-text-dark/90 text-right min-w-[45px] border-r border-app-dark/5 pr-2 mt-12">
            <span>₱{Math.round(maxVal).toLocaleString()}</span>
            <span>₱{Math.round(maxVal / 2).toLocaleString()}</span>
            <span>0</span>
          </div>

          {/* SCROLLABLE CONTENT AREA */}
          <div className="flex-1 overflow-x-auto no-scrollbar overflow-y-visible pt-12">
            <div 
              /* Added px-4 so bars at the start/end don't touch the edge (Overflow Reveal) */
              className="flex items-end justify-between gap-1 h-40 pb-6 relative overflow-visible px-4" 
              style={{ 
                minWidth: range === 'day' ? '600px' : range === 'year' ? '500px' : '100%' 
              }}
            >
              
              {/* Horizontal Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                <div className="w-full border-t border-app-dark/[0.05]" />
                <div className="w-full border-t border-app-dark/[0.05]" />
                <div className="w-full h-0" />
              </div>

              {chartData.map((data, i) => {
                const heightPerc = (data.value / maxVal) * 100;
                const isActive = activeBar === i;

                return (
                  <div 
                    key={i} 
                    className="flex-1 flex flex-col items-center h-full justify-end group/bar relative cursor-pointer"
                    onMouseEnter={() => setActiveBar(i)}
                    onMouseLeave={() => setActiveBar(null)}
                    onClick={() => setActiveBar(i)}
                  >
                    {/* Tooltip: Using app-dark for high contrast numbers */}
                    <div className={`absolute -top-10 transition-all duration-200 z-[999] pointer-events-none
                      ${isActive ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}
                    `}>
                      <div className="bg-gray-200 text-white shadow-2xl rounded-md px-2 py-1.5 whitespace-nowrap relative">
                        <p className="text-[10px] font-bold">₱{Math.round(data.value).toLocaleString()}</p>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-200 rotate-45" />
                      </div>
                    </div>

                    <div 
                      className={`w-full transition-all duration-300 rounded-t-[2px] 
                        ${isActive ? 'bg-blue-700' : 'bg-btn-primary group-hover/bar:bg-blue-700'}`}
                      style={{ height: `${heightPerc}%`, minHeight: data.value > 0 ? '2px' : '0' }}
                    />
                    
                    {/* X-Axis Label: Removed truncate, added whitespace-nowrap */}
                    <span className={`absolute -bottom-5 text-[10px] uppercase whitespace-nowrap w-full text-center px-0.5 
                      ${isActive ? 'text-text-dark font-bold' : 'text-text-dark/90'}`}>
                      {data.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Insight */}
        <div className="mt-4 pt-4 border-t border-app-dark/5 flex justify-between items-center">
          <div className="flex flex-col">
            <p className="text-[14px] text-text-dark/70 mb-0.5">Total sales:</p>
            <p className="text-[17px] text-text-dark lowercase font-bold tracking-tight ">
              ₱{totalInPeriod.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}