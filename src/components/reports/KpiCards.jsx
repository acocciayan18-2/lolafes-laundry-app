import { useEffect, useMemo, useRef, useState } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconDollarSign, IconInfo, IconPackage, IconTrendingUp, IconZap } from "../icons";

const FILTER_OPTIONS = [
  { label: "7d", value: "7" },
  { label: "30d", value: "30" },
  { label: "1y", value: "365" },
];

export default function KpiCards() {
  const [range, setRange] = useState("7");
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);
  
  // We keep the imports as they are used elsewhere or for store reactivity
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

  /* FIX: Removed 'orders' from the dependency array. 
     The linter complained because 'orders' was listed but not actually 
     referenced inside the getAnalytics(range) call.
  */
  const stats = useMemo(() => getAnalytics(range), [range, getAnalytics]);
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
    { label: "Total Sales", value: `₱${Math.round(totalRevenue).toLocaleString()}`, icon: <IconDollarSign />, trend: "Gross earnings" },
    { label: "Orders Volume", value: totalOrders.toLocaleString(), icon: <IconPackage />, trend: "Total loads" },
    { label: "Avg Order Value", value: `₱${Math.round(aov).toLocaleString()}`, icon: <IconTrendingUp />, trend: "Per customer" },
    { label: "Avg Turnaround", value: formatDuration(avgTat), icon: <IconZap />, trend: "Processing speed" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-start items-end">
        <div className="flex gap-1 bg-white p-1 rounded-xl mt-3 w-fit border border-app-dark/30 shadow-sm">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`relative px-5 py-1.5 rounded-lg text-micro font-bold transition-all duration-300 lowercase ${
                range === opt.value ? 'bg-app-dark text-white shadow-md z-10' : 'text-text-dark/60 hover:text-text-dark'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative mb-1" ref={infoRef}>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 text-text-dark/30 hover:text-text-dark transition-colors">
            <IconInfo className="w-4 h-4 text-gray-400 stroke-gray-400" />
          </button>
          {showInfo && (
            <div className="absolute left-0 top-10 w-64 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-sm-text text-text-dark/90 leading-relaxed font-medium">
                Summarized shop health metrics including revenue, load volume, and speed.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md border border-app-dark/10  overflow-hidden">
            <div className="p-3 md:p-5">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <p className="text-nano md:text-micro font-bold text-text-dark/70 mb-1 truncate uppercase">
                    {kpi.label}
                  </p>
                  <p className="text-h2 md:text-h1 font-bold text-text-dark leading-none truncate tracking-tighter cursor-default" title={kpi.value}>
                    {kpi.value}
                  </p>
                  <p className="text-nano md:text-micro font-medium text-text-dark/60 mt-2 truncate italic">
                    {kpi.trend}
                  </p>
                </div>
                
                <div className="p-2 md:p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
                  {require('react').cloneElement(kpi.icon, { 
                    className: "w-4 h-4 md:w-5 md:h-5 text-text-dark stroke-text-dark" 
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