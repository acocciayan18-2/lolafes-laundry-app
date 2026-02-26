import { useEffect, useMemo, useRef, useState } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconInfo, IconZap } from "../icons";

// Static config moved outside to avoid dependency issues
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const HOUR_LABELS = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function RushPulse() {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedDay, setSelectedDay] = useState("all");
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

  for (let hour = 6; hour < 24; hour++) {
    if (selectedDay === "all") {
      let totalForHour = 0;
      for (let day = 0; day < 7; day++) {
        totalForHour += fullHeatmap[day][hour];
      }
      // FIXED: Remove the "/ 7". We want the sum, not the average.
      processed[hour - 6] = totalForHour; 
    } else {
      processed[hour - 6] = fullHeatmap[selectedDay][hour];
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
}, [getPeakHours, selectedDay]);

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
              {/* LABEL: text-micro (11px) */}
              <p className="text-[13px] font-bold text-text-dark/70 truncate  uppercase ">Traffic pulse</p>
              <button onClick={() => setShowInfo(!showInfo)} className="text-text-dark/30 hover:text-text-dark transition-colors">
                <IconInfo className="w-4 h-4 text-gray-400 stroke-gray-400" />
              </button>
              {showInfo && (
                <div className="absolute left-0 top-6 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-50">
                  <p className="text-sm-text text-text-dark/90 leading-relaxed">
                    This chart shows the total accumulation of orders per hour. When 'All' is selected, you are seeing the total combined volume from every day of the week.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="p-2.5 rounded-lg border border-app-dark/10 shadow-hollow shrink-0">
            <IconZap className="w-4 h-4 text-text-dark stroke-text-dark" />
          </div>
        </div>

        <div className="flex gap-1 mb-8 overflow-x-auto pb-2 scrollbar-hide custom-scrollbar">
          <button onClick={() => setSelectedDay("all")} className={`px-3 py-1 rounded-full text-micro font-medium transition-all uppercase ${selectedDay === 'all' ? 'bg-app-dark text-white' : 'bg-app-dark/5 text-text-dark/90'}`}>All</button>
          {DAYS.map((day, i) => (
            <button key={day} onClick={() => setSelectedDay(i)} className={`px-3 py-1 rounded-full  text-micro font-medium transition-all uppercase ${selectedDay === i ? 'bg-app-dark text-white' : 'bg-app-dark/5 text-text-dark/90'}`}>{day}</button>
          ))}
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
              <div className="bg-app-dark shadow-xl rounded-md px-2 py-1.5 flex flex-col items-center">
                <span className="text-nano font-bold text-white leading-none whitespace-nowrap">{hoverData.value} orders</span>
                <span className="text-[8px] text-white/50 lowercase mt-1 font-bold">{hoverData.label}</span>
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
              {selectedDay === 'all' ? 'Typical peak window' : `${DAYS[selectedDay]} peak window`}
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