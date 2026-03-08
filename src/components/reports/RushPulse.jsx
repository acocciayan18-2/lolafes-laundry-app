import { useEffect, useMemo, useRef, useState } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconInfo, IconZap } from "../icons";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';

// Static config moved outside to avoid dependency issues
const HOUR_LABELS = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const DAY_OPTIONS = [
  { label: "All Days", value: "all" },
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

export default function RushPulse() {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAY_OPTIONS[0]); // ✨ Updated to use object state
  const [hoverData, setHoverData] = useState(null); 
  const infoRef = useRef(null);
  const svgRef = useRef(null);
  
  const getPeakHours = useReportStore(state => state.getPeakHours);

  useEffect(() => {
    function handleClickOutside(event) {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { waveData, busiestWindow } = useMemo(() => {
    const fullHeatmap = getPeakHours();
    const processed = Array(18).fill(0);
    const targetDay = selectedDay.value; // ✨ Extracted value

    for (let hour = 6; hour < 24; hour++) {
      if (targetDay === "all") {
        let totalForHour = 0;
        for (let day = 0; day < 7; day++) {
          totalForHour += fullHeatmap[day][hour];
        }
        processed[hour - 6] = totalForHour; 
      } else {
        processed[hour - 6] = fullHeatmap[targetDay][hour];
      }
    }

    const maxVal = Math.max(...processed);
    const peakIdx = processed.indexOf(maxVal);
    
    const formatTime = (hIdx) => {
      const h = HOUR_LABELS[hIdx];
      const period = (hIdx + 6) >= 12 && (hIdx + 6) < 24 ? 'pm' : 'am';
      return `${h} ${period}`;
    };

    const windowText = maxVal > 0 
      ? `${formatTime(Math.max(0, peakIdx - 1))} — ${formatTime(Math.min(17, peakIdx + 2))}` 
      : "no data yet";

    return { waveData: processed, busiestWindow: windowText };
  }, [getPeakHours, selectedDay.value]); // ✨ Dependency updated

  const maxValue = Math.max(...waveData, 1);
  const chartHeight = 100;
  const chartWidth = 500;

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.round((x / rect.width) * (waveData.length - 1));
    const safeIndex = Math.max(0, Math.min(waveData.length - 1, index));
    
    const value = waveData[safeIndex];
    const hour = HOUR_LABELS[safeIndex];
    const period = (safeIndex + 6) >= 12 && (safeIndex + 6) < 24 ? 'pm' : 'am';

    setHoverData({
      x: (safeIndex / (waveData.length - 1)) * 100,
      value: Math.round(value),
      label: `${hour} ${period}`
    });
  };

  const points = waveData.map((val, i) => {
    const x = (i / (waveData.length - 1)) * chartWidth;
    const y = chartHeight - (val / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 transform overflow-hidden relative">
      <div className="p-5">
        
        {/* Header Section */}
        <div className="flex items-start justify-between gap-1 mb-2">
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-[13px] font-bold text-text-dark/70 truncate uppercase ">Traffic pulse</p>
              <button onClick={() => setShowInfo(!showInfo)} className="text-text-dark/30 hover:text-text-dark transition-colors">
                <IconInfo className="w-4 h-4 text-gray-400 stroke-gray-400" />
              </button>
              <AnimatePresence>
                {showInfo && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute left-0 top-6 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]"
                  >
                    <p className="text-sm-text text-text-dark/90 leading-relaxed">
                      This chart shows the total accumulation of orders per hour. When 'All Days' is selected, you are seeing the total combined volume from every day of the week.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="p-2.5 rounded-lg border border-app-dark/10 shadow-hollow shrink-0">
            <IconZap className="w-4 h-4 text-text-dark stroke-text-dark" />
          </div>
        </div>

        {/* ✨ FILTER DROPDOWN (Replaced button list) */}
        <div className="relative w-32 mb-6 z-50">
          <Listbox value={selectedDay} onChange={(val) => {
            setSelectedDay(val);
            setHoverData(null); // Reset hover tooltip on change
          }}>
            {({ open }) => (
              <>
                <ListboxButton className="relative w-full cursor-pointer bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 pl-3 pr-8 text-[13px] font-bold text-text-dark text-left hover:bg-slate-50 transition-colors focus:outline-none">
                  <span className="block truncate font-medium">{selectedDay.label}</span>
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
                      className="absolute mt-1.5 max-h-60 w-full custom-scrollbar overflow-auto rounded-xl bg-white py-1 shadow-xl border border-slate-100 ring-1 ring-black ring-opacity-5 focus:outline-none"
                    >
                      {DAY_OPTIONS.map((f) => (
                        <ListboxOption
                          key={f.value}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2.5 pl-3 pr-3 text-[13px] font-medium transition-colors ${
                              active ? 'bg-app-dark/5 text-app-dark' : 'text-text-dark/80'
                            }`
                          }
                          value={f}
                        >
                          {({ selected }) => (
                            <span className={`block truncate ${selected ? 'font-bold text-app-dark' : 'font-medium'}`}>
                              {f.label}
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

        {/* Chart Area */}
        <div 
          className="relative h-32 w-full mt-4 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverData(null)}
        >
          <svg ref={svgRef} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <polyline fill="rgba(0,0,0,0.03)" points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`} />
            <polyline fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dark/80" points={points} strokeLinejoin="round" strokeLinecap="round" />
            
            {hoverData && (
              <line x1={(hoverData.x / 100) * chartWidth} y1="0" x2={(hoverData.x / 100) * chartWidth} y2={chartHeight} stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="text-text-dark/20" />
            )}
          </svg>

          {/* Floating Tooltip */}
          {hoverData && (
            <div 
              className="absolute top-0 pointer-events-none transition-all duration-75 ease-out z-10"
              style={{ left: `${hoverData.x}%`, transform: 'translateX(-50%)' }}
            >
              <div className="shadow-md rounded-md border bg-white px-2 py-1.5 flex flex-col items-center">
                <span className="text-[10px] font-bold text-text-dark leading-none whitespace-nowrap">{hoverData.value} orders</span>
                <span className="text-[9px] text-text-dark/50 lowercase mt-1 font-bold">{hoverData.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Axis: text-nano (10px) */}
        <div className="flex justify-between mt-4 px-1">
          {HOUR_LABELS.map((hour, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <span className="text-nano font-bold text-text-dark/70">{hour}</span>
            </div>
          ))}
        </div>

        {/* Real-time Insights */}
        <div className="mt-4 pt-4 border-t border-app-dark/5 flex justify-between items-center">
          <div className="flex flex-col">
            <p className="text-nano font-bold text-text-dark/70 mb-0.5 uppercase">
              {selectedDay.value === 'all' ? 'Typical peak window' : `${selectedDay.label} peak window`}
            </p>
            {/* VALUE: text-sm-text (13px) */}
            <p className="text-sm-text text-text-dark font-bold">
              {busiestWindow}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}