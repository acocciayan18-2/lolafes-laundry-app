import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { useReportStore } from "../../store/reports/useReportStore";
import { useExpenseStore } from "../../store/expenses/useExpenseStore";
import { IconInfo, IconDollarCircle } from "../icons";

// ✨ Automatically generate years dynamically from the launch year (2026) to the current year
const generateTimeFilters = () => {
  const currentYear = new Date().getFullYear();
  const baseYear = 2026;
  const filters = [
    { id: "this_week", label: "This Week", type: "week" },
    { id: "this_month", label: "This Month", type: "month" }, 
  ];
  
  for (let y = currentYear; y >= baseYear; y--) {
    filters.push({ 
      id: `year_${y}`, 
      label: y === currentYear ? `This Year (${y})` : `Year ${y}`, 
      type: "year", 
      year: y 
    });
  }
  return filters;
};

const TIME_FILTERS = Object.freeze(generateTimeFilters());

const safeNumber = (val) => {
  const num = Number(val);
  return (isNaN(num) || num < 0) ? 0 : num;
};

const formatSmartMoney = (val) => {
  const num = safeNumber(val);
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: num % 1 !== 0 ? 2 : 0, 
    maximumFractionDigits: num % 1 !== 0 ? 2 : 0 
  });
};

const sanitizeHtml = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
};

const ProfitBar = React.memo(({ data, maxVal, isActive, isYearView, isDrillable, onHover, onLeave, onClick }) => {
  const heightPerc = maxVal > 0 && data.netProfit > 0 ? Math.min((data.netProfit / maxVal) * 100, 100) : 0;
  
  const isProfitable = data.netProfit >= 0;
  const isZeroDay = data.netProfit === 0;
  
  let barColor = isProfitable ? "from-emerald-500 to-teal-400" : "from-rose-500 to-rose-400"; 
  if (isZeroDay) barColor = "from-slate-200 to-slate-100"; 
  
  const opacityClass = isActive === false ? "opacity-40" : "opacity-100";

  return (
    <div 
      className={`flex-1 flex flex-col items-center h-full justify-end relative outline-none focus-visible:ring-2 focus-visible:ring-app-dark rounded-t-md group ${isDrillable && !isZeroDay ? 'cursor-zoom-in' : 'cursor-pointer'}`}
      onMouseEnter={onHover} 
      onMouseLeave={onLeave}
      onClick={onClick}
      onFocus={onHover}
      onBlur={onLeave}
      tabIndex={0}
      role="graphics-symbol"
      aria-label={`${data.label}: Projected Profit ₱${formatSmartMoney(data.netProfit)}`}
    >
      <div 
        className={`absolute ${isYearView ? '-top-24' : '-top-16'} transition-all duration-200 z-[999] pointer-events-none flex flex-col items-center
          ${isActive === true ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
        aria-hidden="true"
      >
        <div className="bg-app-dark text-white shadow-xl rounded-lg px-3 py-2 w-max min-w-[120px]">
          <p className="text-micro text-white/60 font-bold uppercase mb-1 border-b border-white/10 pb-1">{sanitizeHtml(data.label)}</p>
          
          {isYearView ? (
            <>
              <div className="flex justify-between gap-3 text-nano mb-0.5">
                <span className="text-white/80">Order Profit:</span>
                <span className="font-bold text-emerald-300">₱{formatSmartMoney(data.orderProfit)}</span>
              </div>
              <div className="flex justify-between gap-3 text-nano mb-1">
                <span className="text-white/80">Overhead:</span>
                <span className="font-bold text-rose-300">-₱{formatSmartMoney(data.monthlyOverhead)}</span>
              </div>
              <div className="flex justify-between gap-3 text-micro pt-1 border-t border-white/20">
                <span className="font-bold">Projected Net:</span>
                <span className={`font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfitable && !isZeroDay ? '+' : ''}₱{formatSmartMoney(data.netProfit)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between gap-3 text-micro">
              <span className="font-bold">Projected Profit:</span>
              <span className={`font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfitable && !isZeroDay ? '+' : ''}₱{formatSmartMoney(data.netProfit)}
              </span>
            </div>
          )}
        </div>
        <div className="w-2.5 h-2.5 bg-app-dark rotate-45 -mt-1.5" />
      </div>

      <div 
        className={`w-full max-w-[32px] transition-all duration-500 rounded-t-md bg-gradient-to-t shadow-sm ${barColor} ${opacityClass} relative overflow-hidden`}
        style={{ height: `${heightPerc}%`, minHeight: !isZeroDay ? '6px' : '2px' }}
      >
        <div className="absolute inset-0 bg-white opacity-10 w-full h-full" />
      </div>
      
      <span className={`absolute -bottom-6 text-nano uppercase whitespace-nowrap w-full text-center px-0.5 transition-colors ${isActive === true ? 'text-app-dark font-bold' : 'text-text-dark/70'}`} aria-hidden="true">
        {sanitizeHtml(data.shortLabel)}
      </span>
    </div>
  );
});
ProfitBar.displayName = "ProfitBar";

export default function ProfitPerformance() {
  const [selectedFilter, setSelectedFilter] = useState(TIME_FILTERS[1]); 
  const [showInfo, setShowInfo] = useState(false);
  const [activeBarIndex, setActiveBarIndex] = useState(null); 
  
  const infoRef = useRef(null);

  const fetchProfitTrend = useReportStore(state => state.fetchProfitTrend);
  const isProfitLoading = useReportStore(state => state.isProfitLoading);
  const { chartData, maxVal, totalNetProfit } = useReportStore(state => state.profitTrendData) || { chartData: [], maxVal: 100, totalNetProfit: 0 };

  // ✨ Data Fetching for Overhead Expenses Calculation
  const expenses = useExpenseStore(state => state.expenses || []);
  const fetchAllExpenses = useExpenseStore(state => state.fetchAllExpenses);

  useEffect(() => {
    if (typeof fetchAllExpenses === 'function') fetchAllExpenses();
  }, [fetchAllExpenses]);

  // ✨ Accurately calculate Overhead for the currently selected Month view
  const overheadThisMonth = useMemo(() => {
    let monthStr = null;
    if (selectedFilter.type === 'month') {
      const now = new Date();
      monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else if (selectedFilter.type === 'specific_month') {
      monthStr = `${selectedFilter.year}-${String(selectedFilter.month + 1).padStart(2, '0')}`;
    }
    
    if (!monthStr) return 0;
    
    return expenses
      .filter(e => e.applicable_month === monthStr)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [selectedFilter, expenses]);

  useEffect(() => {
    const abortController = new AbortController();
    if (typeof fetchProfitTrend === 'function') {
      fetchProfitTrend({
        range: selectedFilter.type,
        year: selectedFilter.year,
        month: selectedFilter.month
      }, abortController.signal);
    }
    return () => abortController.abort();
  }, [selectedFilter, fetchProfitTrend]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) setShowInfo(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const handleBarClick = (index, data) => {
    if (selectedFilter.type === 'year' && data.netProfit !== 0) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const targetYear = selectedFilter.year;
      
      setSelectedFilter({
        id: `drilldown_${targetYear}_${index}`,
        label: `${monthNames[index]} ${targetYear}`,
        type: 'specific_month',
        year: targetYear, 
        month: index,
        parentFilter: selectedFilter 
      });
      setActiveBarIndex(null);
    } else {
      setActiveBarIndex(index === activeBarIndex ? null : index);
    }
  };

  const isWideChart = ['month', 'specific_month'].includes(selectedFilter.type);

  return (
    <section className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 h-full relative overflow-visible flex flex-col" aria-labelledby="profit-chart-title">
      <div className="p-5 overflow-visible flex-1 flex flex-col">
        <header className="flex justify-between items-start gap-1 mb-2 shrink-0">
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            <div className="flex items-center gap-2">
              <h2 id="profit-chart-title" className="text-sm-text font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Projected Profit Ledger
              </h2>

              {selectedFilter.parentFilter && (
                <button 
                  onClick={() => setSelectedFilter(selectedFilter.parentFilter)}
                  className="flex items-center gap-1 text-nano font-bold text-app-dark hover:text-emerald-600 transition-colors bg-app-dark/5 px-2 py-1 rounded-md"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                  Back to {selectedFilter.parentFilter.year}
                </button>
              )}

              <button onClick={() => setShowInfo(!showInfo)} className="text-text-dark/30 hover:text-app-dark focus:outline-none focus-visible:ring-2 rounded-full">
                 <IconInfo className="w-4 h-4" />
              </button>
              
              <AnimatePresence>
                {showInfo && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute left-0 top-7 w-72 p-4 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]">
                    <div className="space-y-3">
                      <p className="text-sm-text text-text-dark/90 leading-relaxed font-normal">
                        <strong>Dashboard Overview:</strong> This module tracks your operating cash flow by deducting logged monthly overhead from your immutable order profits (Revenue minus Cost of Goods).
                      </p>
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-micro text-amber-800 leading-relaxed font-medium">
                          <strong>Tentative Projections:</strong> The numbers displayed are <em>projected estimates</em> based strictly on data inputted into the system. Actual real-world earnings may vary due to undocumented spending, unrecorded refunds, or external fees.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative mt-2 w-max min-w-[130px] z-10"> 
              <Listbox value={selectedFilter} onChange={(val) => { setSelectedFilter(val); setActiveBarIndex(null); }} disabled={isProfitLoading}>
                {({ open }) => (
                  <>
                    <ListboxButton className="relative w-full cursor-pointer bg-white border border-app-dark/10 shadow-sm rounded-xl py-1.5 pl-3 pr-8 text-sm-text font-bold text-text-dark text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/20 transition-all">
                      <span className="block truncate">{selectedFilter.label}</span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <svg className={`w-4 h-4 text-text-dark/50 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                      </span>
                    </ListboxButton>
                    <AnimatePresence>
                      {open && (
                        <ListboxOptions static as={motion.ul} className="absolute mt-1.5 w-full bg-white py-1 shadow-xl border border-slate-100 rounded-xl focus:outline-none z-[100]">
                          {TIME_FILTERS.map((f) => (
                            <ListboxOption key={f.id} value={f} className={({ active }) => `cursor-pointer py-2 px-3 text-sm-text transition-colors ${active ? 'bg-app-dark/5 text-app-dark font-bold' : 'text-text-dark/80'}`}>
                              {f.label}
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
          
          <div className="p-2.5 rounded-lg border border-app-dark/10 shadow-hollow shrink-0 bg-amber-50">
            <IconDollarCircle className="w-5 h-5 text-text-dark stroke-text-dark" />
          </div>
        </header>

        {/* ✨ REFACTORED SCROLLABLE CHART CONTAINER */}
        <div className="flex flex-1 gap-2 relative" aria-busy={isProfitLoading}>
          
          {/* Y-Axis Labels (Fixed/Sticky) */}
          <div className="flex flex-col justify-between h-[160px] pb-6 text-sm-text text-text-dark/90 text-right min-w-[45px] pr-2 mt-28" aria-hidden="true">
            <span>₱{formatSmartMoney(maxVal)}</span>
            <span>₱{formatSmartMoney(maxVal / 2)}</span>
            <span>0</span>
          </div>

          {/* X-Axis Chart Area (Horizontally Scrollable) */}
          <div className="flex-1 overflow-x-auto custom-scrollbar pt-28 relative pb-2">
            <div className="flex items-end justify-between h-[160px] pb-6 relative px-2" style={{ minWidth: isWideChart ? '800px' : '100%', gap: '8px' }}>
              
              {/* Background Dash Lines spanning full scrollable width */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 px-2 min-w-full" aria-hidden="true">
                <div className="w-full border-t border-dashed border-app-dark/10" />
                <div className="w-full border-t border-dashed border-app-dark/10" />
                <div className="w-full border-t-2 border-app-dark/10" />
              </div>

              {chartData.map((data, i) => (
                <ProfitBar 
                  key={`bar-${i}`}
                  data={data}
                  maxVal={maxVal}
                  isActive={activeBarIndex === null ? null : activeBarIndex === i}
                  isYearView={selectedFilter.type === 'year'}
                  isDrillable={selectedFilter.type === 'year'}
                  onHover={() => setActiveBarIndex(i)}
                  onLeave={() => setActiveBarIndex(null)}
                  onClick={() => handleBarClick(i, data)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ✨ REFACTORED FOOTER & EXPLANATION */}
      <footer className="mx-5 mb-4 mt-auto border-t border-app-dark/5 pt-3 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <p className="text-nano text-text-dark/70 uppercase font-bold mb-0.5">
              Projected Gains ({selectedFilter.label})
            </p>
            <p className={`text-h2 font-bold tracking-tight leading-none ${totalNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isProfitLoading ? "..." : `${totalNetProfit >= 0 ? '+' : ''}₱${formatSmartMoney(totalNetProfit)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <p className="text-micro text-text-dark/60 leading-relaxed w-full">
            {selectedFilter.type === 'year' 
              ? "Monthly bars represent Projected Net Profit (Order Profit minus Monthly Overhead Expenses)."
              : selectedFilter.type === 'week'
              ? "Daily bars represent projected order profit. Monthly overhead expenses are NOT deducted in this weekly view."
              : (
                <span className="flex flex-col">
                  <span>Daily bars represent projected order profit. <strong>Note:</strong> The Total Net Profit shown above has <u>not</u> been reduced by this month's overhead expenses in this view.</span>
                  <span className="text-rose-600 font-bold mt-1.5 block">
                    Total Overhead Expense logged for this month: ₱{formatSmartMoney(overheadThisMonth)}
                  </span>
                </span>
              )}
          </p>
        </div>
      </footer>
    </section>
  );
}