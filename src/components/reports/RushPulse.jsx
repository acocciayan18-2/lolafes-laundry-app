import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { useReportStore } from "../../store/reports/useReportStore";
import { IconInfo, IconZap } from "../icons";

// ==========================================
// CONFIGURATION & CONSTANTS (Frozen)
// ==========================================
const HOUR_LABELS = Object.freeze([6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

const DAY_OPTIONS = Object.freeze([
  { label: "All Days", value: "all" },
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
]);

// ==========================================
// UTILITY HELPERS
// ==========================================
const formatTime = (hIdx) => {
  const h = HOUR_LABELS[hIdx];
  const period = (hIdx + 6) >= 12 && (hIdx + 6) < 24 ? 'pm' : 'am';
  return `${h} ${period}`;
};

const safeGetHourValue = (heatmap, day, hour) => {
  if (!heatmap || !heatmap[day] || isNaN(heatmap[day][hour])) return 0;
  return Math.max(0, Number(heatmap[day][hour])); 
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function RushPulse() {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAY_OPTIONS[0]);
  const [activeIndex, setActiveIndex] = useState(null); 
  
  const infoRef = useRef(null);
  const chartRef = useRef(null);
  
  // ✨ FIX: Subscribe directly to orders so the component re-renders when data arrives

  const getPeakHours = useReportStore(state => state.getPeakHours);

  const toggleInfo = useCallback(() => setShowInfo(prev => !prev), []);

  useEffect(() => {
    if (!showInfo) return;

    const handleClickOutside = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) setShowInfo(false);
      if (chartRef.current && !chartRef.current.contains(event.target)) setActiveIndex(null);
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowInfo(false);
        setActiveIndex(null);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showInfo]);

  const { waveData, maxValue, busiestWindow } = useMemo(() => {
    let fullHeatmap = {};
    try {
      fullHeatmap = getPeakHours() || {};
    } catch (err) {
      console.error("[RushPulse] Failed to fetch heatmap:", err);
    }

    const processed = Array(18).fill(0);
    const targetDay = selectedDay.value;

    for (let hour = 6; hour < 24; hour++) {
      const idx = hour - 6;
      if (targetDay === "all") {
        let totalForHour = 0;
        for (let day = 0; day < 7; day++) {
          totalForHour += safeGetHourValue(fullHeatmap, day, hour);
        }
        processed[idx] = totalForHour; 
      } else {
        processed[idx] = safeGetHourValue(fullHeatmap, targetDay, hour);
      }
    }

    const maxVal = Math.max(...processed);
    const currentPeakIdx = processed.indexOf(maxVal);
    
    const windowText = maxVal > 0 
      ? `${formatTime(Math.max(0, currentPeakIdx - 1))} — ${formatTime(Math.min(17, currentPeakIdx + 1))}` 
      : "No data available";

    return { 
      waveData: processed, 
      maxValue: maxVal > 0 ? maxVal * 1.15 : 10, 
      busiestWindow: windowText
    };
  // ✨ FIX: Included orders in the dependency array
  }, [getPeakHours, selectedDay.value]); 

  const CHART_W = 1000;
  const CHART_H = 200;

  const { linePath, areaPath } = useMemo(() => {
    const pts = waveData.map((val, i) => {
      const x = (i / (waveData.length - 1)) * CHART_W;
      const y = CHART_H - (val / maxValue) * CHART_H;
      return { x, y, val };
    });

    let pathData = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const curr = pts[i];
      const prev = pts[i - 1];
      const midX = (prev.x + curr.x) / 2;
      pathData += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
    }

    const area = `${pathData} L ${CHART_W},${CHART_H} L 0,${CHART_H} Z`;

    return { linePath: pathData, areaPath: area };
  }, [waveData, maxValue]);

  return (
    <section 
      className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 h-full flex flex-col relative overflow-visible"
      aria-labelledby="rush-pulse-title"
    >
      <div className="p-5 flex-1 flex flex-col overflow-visible">
        
        <header className="flex items-start justify-between gap-1 mb-2 shrink-0">
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            <div className="flex items-center gap-1.5 mb-1">
              <h2 id="rush-pulse-title" className="text-sm-text font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Traffic Pulse
              </h2>
              <button 
                onClick={toggleInfo}
                aria-expanded={showInfo}
                aria-label="Information about Traffic Pulse"
                className="text-text-dark/30 hover:text-app-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-app-dark/20 transition-colors rounded-full"
              >
                <IconInfo className="w-4 h-4" aria-hidden="true" />
              </button>

              <AnimatePresence>
                {showInfo && (
                  <motion.div 
                    role="tooltip"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute left-0 top-7 w-64 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]"
                  >
                    <p className="text-sm-text text-text-dark/90 leading-relaxed font-normal">
                      Monitors operational load per hour. Hover over the curve to see the total combined volume from every day of the week.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative mt-2 w-max min-w-[140px] z-[90]" aria-label="Select day filter for traffic pulse chart">
              <Listbox 
                value={selectedDay} 
                onChange={(val) => {
                  setSelectedDay(val);
                  setActiveIndex(null); 
                }}
              >
                {({ open }) => (
                  <>
                    <ListboxButton className="relative w-full cursor-pointer bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 pl-3 pr-8 text-sm-text font-bold text-text-dark text-left hover:bg-slate-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/20">
                      <span className="block truncate text-sm-text">{selectedDay.label}</span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <svg 
                          className={`w-4 h-4 text-text-dark/50 transition-transform duration-200 ease-in-out ${open ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
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
                          className="absolute z-[100] mt-1.5 max-h-60 w-max min-w-full overflow-auto custom-scrollbar rounded-xl bg-white py-1 shadow-xl border border-slate-100 ring-1 ring-black/5 focus:outline-none isolate"
                        >
                          {DAY_OPTIONS.map((f) => ( 
                            <ListboxOption
                              key={f.value}
                              value={f}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2.5 pl-3 pr-4 text-sm-text transition-colors ${
                                  active ? 'bg-app-dark/5 text-app-dark font-bold' : 'text-text-dark/80'
                                }`
                              }
                            >
                              <span className="block truncate">{f.label}</span>
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
          <div className="p-2.5 rounded-lg border border-app-dark/10 shadow-hollow shrink-0 bg-transparent" aria-hidden="true">
            <IconZap className="w-4 h-4 text-text-dark stroke-text-dark" />
          </div>
        </header>

        {/* CHART AREA */}
        <div 
          className="relative flex-1 w-full mt-10 min-h-[120px]" 
          ref={chartRef}
          role="graphics-document"
          aria-label="Line chart showing order traffic per hour"
        >
          
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-full overflow-visible absolute inset-0" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            <path d={areaPath} fill="url(#areaGradient)" />
            <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>

          <div className="absolute inset-0">
            {waveData.map((val, i) => {
              const xPerc = (i / (waveData.length - 1)) * 100;
              
              return (
                <div 
                  key={`zone-${i}`}
                  className="absolute top-0 bottom-0 group cursor-pointer outline-none focus-visible:bg-blue-500/10"
                  style={{ 
                    left: `${xPerc}%`, 
                    width: `${100 / (waveData.length - 1)}%`,
                    transform: 'translateX(-50%)'
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(i)}
                  onBlur={() => setActiveIndex(null)}
                  tabIndex={0}
                  aria-label={`${val} orders at ${formatTime(i)}`}
                >
                  <div className={`absolute inset-y-0 left-1/2 w-px bg-blue-400/30 transition-opacity duration-200 pointer-events-none -translate-x-1/2
                    ${activeIndex === i ? 'opacity-100' : 'opacity-0'}`} 
                  />

                  <div 
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none transition-all duration-200 z-[60]
                      ${activeIndex === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                    aria-hidden="true"
                  >
                    <div className="bg-app-dark text-white shadow-sm rounded-md px-2.5 py-1.5 flex flex-col items-center">
                      <span className="text-micro font-bold tracking-wide whitespace-nowrap">{val} orders</span>
                      <span className="text-nano text-white/60 lowercase mt-0.5  whitespace-nowrap">{formatTime(i)}</span>
                    </div>
                    <div className="w-2 h-2 bg-app-dark rotate-45 mx-auto -mt-1" />
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* X-AXIS LABELS */}
        <div className="relative w-full h-4 mt-2 z-10 shrink-0" aria-hidden="true">
          {HOUR_LABELS.map((hour, i) => {
            const xPerc = (i / (HOUR_LABELS.length - 1)) * 100;
            return (
              <div 
                key={`lbl-${i}`} 
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${xPerc}%`, transform: 'translateX(-50%)' }}
              >
                <span className={`text-nano font-bold transition-colors ${activeIndex === i ? 'text-blue-600 scale-110' : 'text-text-dark/40'}`}>
                  {hour}
                </span>
              </div>
            );
          })}
        </div>

      </div>

      <footer className="mx-5 mb-4 mt-auto border-t border-app-dark/5 pt-3 flex justify-between items-center">
        <div className="flex flex-col">
          <p className="text-nano font-bold text-text-dark/50 mb-0.5 uppercase ">
            {selectedDay.value === 'all' ? 'Typical peak window' : `${selectedDay.label} peak window`}
          </p>
          <p className="text-base-text text-text-dark font-bold tracking-tight leading-none">
            {busiestWindow}
          </p>
        </div>
      </footer>
    </section>
  );
}