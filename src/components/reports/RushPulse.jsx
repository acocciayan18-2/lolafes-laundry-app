import { useMemo, useState, useEffect, useRef } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { IconZap, IconInfo } from "../icons";

export default function RushPulse() {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedDay, setSelectedDay] = useState("all");
  const [hoverData, setHoverData] = useState(null); 
  const infoRef = useRef(null);
  const svgRef = useRef(null);
  
  const orders = useReportStore(state => state.orders); 
  const getPeakHours = useReportStore(state => state.getPeakHours);
  
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const hourLabels = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

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
        // Use Math.round to ensure no decimals in the average
        processed[hour - 6] = Math.round(totalForHour / 7);
      } else {
        // Specific days are already whole numbers
        processed[hour - 6] = fullHeatmap[selectedDay][hour];
      }
    }

    const maxVal = Math.max(...processed);
    const peakIdx = processed.indexOf(maxVal);
    
    const formatTime = (hIdx) => {
      const h = hourLabels[hIdx];
      const period = (hIdx + 6) >= 12 && (hIdx + 6) < 24 ? 'pm' : 'am';
      return `${h} ${period}`;
    };

    const windowText = maxVal > 0 
      ? `${formatTime(Math.max(0, peakIdx - 1))} — ${formatTime(Math.min(17, peakIdx + 2))}` 
      : "no data yet";

    return { waveData: processed, busiestWindow: windowText };
  }, [orders, getPeakHours, selectedDay]);

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
    const hour = hourLabels[safeIndex];
    const period = (safeIndex + 6) >= 12 && (safeIndex + 6) < 24 ? 'pm' : 'am';

    setHoverData({
      x: (safeIndex / (waveData.length - 1)) * 100,
      value: Math.round(value), // Ensure whole number in tooltip
      label: `${hour} ${period}`
    });
  };

  const points = waveData.map((val, i) => {
    const x = (i / (waveData.length - 1)) * chartWidth;
    const y = chartHeight - (val / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 transform  overflow-hidden relative">
      <div className="p-5">
        
        {/* Header Section */}
        <div className="flex items-start justify-between gap-1 ">
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-[13px] font-bold text-text-dark/70 truncate  uppercase">traffic pulse</p>
              <button onClick={() => setShowInfo(!showInfo)} className="text-text-dark/30 hover:text-text-dark transition-colors">
                <IconInfo className="w-4 h-4 text-gray-400 stroke-gray-400" />
              </button>
              {showInfo && (
                <div className="absolute left-0 top-6 w-52 p-3 bg-white  border border-app-dark/30 shadow-xl rounded-lg z-50">
                  <p className="text-[13px] text-text-dark/90 leading-relaxed">
                    This chart shows the whole numbers of orders per hour. When 'All' is selected, it shows the rounded average traffic for a typical day.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="p-2.5 rounded-lg border border-app-dark/10 shadow-hollow shrink-0">
            <IconZap className="w-4 h-4 text-text-dark stroke-text-dark" />
          </div>
        </div>

        {/* Day Selector */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setSelectedDay("all")} className={`px-3 py-1 rounded-full text-[10px] transition-all uppercase ${selectedDay === 'all' ? 'bg-app-dark text-white' : 'bg-app-dark/5 text-text-dark/40'}`}>All</button>
          {days.map((day, i) => (
            <button key={day} onClick={() => setSelectedDay(i)} className={`px-3 py-1 rounded-full text-[10px] transition-all uppercase ${selectedDay === i ? 'bg-app-dark text-white' : 'bg-app-dark/5 text-text-dark/40'}`}>{day}</button>
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
              <div className="bg-white border border-app-dark/10 shadow-xl rounded-md px-2 py-1.5 flex flex-col items-center">
                <span className="text-sm text-text-dark leading-none">{hoverData.value} orders</span>
                <span className="text-[8px] text-text-dark/40 lowercase">{hoverData.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Axis */}
        <div className="flex justify-between mt-4 px-1">
          {hourLabels.map((hour, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <span className="text-[10px] text-text-dark/90">{hour}</span>
            </div>
          ))}
        </div>

        {/* Real-time Insights */}
        <div className="mt-4 pt-4 border-t border-app-dark/5 flex justify-between items-center">
          <div className="flex flex-col">
            <p className="text-[10px] text-text-dark/90 mb-0.5 uppercase">
              {selectedDay === 'all' ? 'typical peak window' : `${days[selectedDay]} peak window`}
            </p>
            <p className="text-[14px] text-text-dark font-medium">
              {busiestWindow}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}