/**
 * @file MonthlyExpensesBoard.jsx
 * @description Accordion-style dashboard for viewing historical monthly expenses.
 * @architecture Implements standardized Report Page header, Info Tooltip, and Icon Mapping.
 */

import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExpenseStore } from "../../store/expenses/useExpenseStore";
import {
  IconInfo, IconWallet,
  IconAllCategories, IconBolt, IconDroplet, IconHome,
  IconPen, IconWrench, IconLightbulb, IconLayout
} from "../icons";

// Frozen constant mapped with our new custom SVG React components
const CATEGORY_MAP = Object.freeze({
  all: { label: "All Categories", icon: <IconAllCategories className="w-5 h-5 shrink-0" /> },
  electricity: { label: "Electricity", icon: <IconBolt className="w-5 h-5 shrink-0" /> },
  water: { label: "Water Bill", icon: <IconDroplet className="w-5 h-5 shrink-0" /> },
  rent: { label: "Space Rent", icon: <IconHome className="w-5 h-5 shrink-0" /> },
  payroll: { label: "Staff Payroll", icon: <IconWallet className="w-5 h-5 shrink-0" /> },
  supplies_manual: { label: "Bulk Supplies", icon: <IconPen className="w-5 h-5 shrink-0" /> },
  maintenance: { label: "Maintenance", icon: <IconWrench className="w-5 h-5 shrink-0" /> },
  misc: { label: "Miscellaneous", icon: <IconLightbulb className="w-5 h-5 shrink-0" /> },
  supplies_auto: { label: "Auto-Supplies", icon: <IconLayout className="w-5 h-5 shrink-0" /> }
});

const formatMoney = (val) => {
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
  </svg>
);

// 🧩 Atomic Accordion Item (Memoized for scroll performance)
const MonthAccordion = React.memo(({ monthStr, data }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Format "2026-04" to "April 2026"
  const formattedMonth = new Date(`${monthStr}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="border border-slate-200 rounded-xl mb-1.5 overflow-hidden bg-white shadow-sm transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 py-3 bg-slate-50/50 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/20"
        aria-expanded={isOpen}
      >
        <div className="flex flex-col items-start">
          <span className="text-sm-text font-bold text-slate-800">{formattedMonth}</span>
          <span className="text-micro text-text-dark/80 font-medium">{data.items.length} recorded items</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm-text font-bold text-rose-600">₱{formatMoney(data.total)}</span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDownIcon className="w-5 h-5 text-slate-400" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="p-2 border-t border-slate-100 bg-white">
              <ul className="divide-y divide-slate-50">
                {data.items.map((item, idx) => {
                  const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.misc;
                  return (
                    <li key={item.id || idx} className="py-2 px-2 flex justify-between items-center gap-3 hover:bg-slate-50/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-text-dark/80 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 " aria-hidden="true">
                          {cat.icon}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm-text  text-text-dark truncate">{cat.label}</span>
                          {item.notes && (
                            <span className="text-micro text-text-dark/80 truncate max-w-[200px]" title={item.notes}>
                              {item.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm-text  text-text-dark shrink-0">₱{formatMoney(item.amount)}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
MonthAccordion.displayName = "MonthAccordion";


// 🚀 Main Dashboard Component
export default function MonthlyExpensesBoard() {
  const expenses = useExpenseStore(state => state.expenses || []);
  const fetchAllExpenses = useExpenseStore(state => state.fetchAllExpenses);
  const isFetching = useExpenseStore(state => state.isFetching);

  // States for Info Tooltip
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);

  // Click-Outside Listener for Tooltip
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) setShowInfo(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchAllExpenses();
  }, [fetchAllExpenses]);

  // 🧮 O(N) Grouping Engine
  const groupedExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    
    const groups = {};
    for (let i = 0; i < expenses.length; i++) {
      const exp = expenses[i];
      const month = exp.applicable_month;
      if (!month) continue;

      if (!groups[month]) groups[month] = { total: 0, items: [] };
      groups[month].items.push(exp);
      groups[month].total += (Number(exp.amount) || 0);
    }
    
    // Convert object to array and sort by month descending (newest at the top)
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  return (
    <section 
      className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 flex flex-col h-full overflow-hidden" 
      aria-labelledby="overhead-ledger-title"
    >
      <div className="p-5 flex-1 flex flex-col overflow-hidden">
        
        {/* --- HEADER --- */}
        <header className="flex justify-between items-start gap-1 mb-4 shrink-0">
          
          {/* LEFT: Title, Info & Badge */}
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            
            <div className="flex items-center gap-2 mb-1">
              <h2 id="overhead-ledger-title" className="text-sm-text font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Monthly Expenses History
              </h2>
              
              <button 
                onClick={() => setShowInfo(!showInfo)} 
                className="text-text-dark/30 hover:text-app-dark focus:outline-none focus-visible:ring-2 rounded-full"
                aria-label="Information about Expenses History"
                aria-expanded={showInfo}
              >
                 <IconInfo className="w-4 h-4" aria-hidden="true" />
              </button>
              
              <AnimatePresence>
                {showInfo && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }} 
                    className="absolute left-0 top-7 w-64 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]"
                    role="tooltip"
                  >
                    <p className="text-sm-text text-text-dark/90 leading-relaxed font-normal">
                      A chronological breakdown of all logged overhead expenses. Use this to track monthly spending trends across different categories.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* BADGE (Below Title) */}
            <div className="relative mt-2 flex items-center gap-1.5 z-10">
              <span className="bg-slate-50 text-text-dark text-micro font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm" aria-label={`${groupedExpenses.length} months recorded`}>
                {groupedExpenses.length} Months Recorded
              </span>
            </div>

          </div>

          {/* RIGHT: Accent Icon Block */}
          <div className="p-2.5 rounded-lg border border-slate-200 shadow-hollow shrink-0 bg-slate-50" aria-hidden="true">
            <IconWallet className="w-5 h-5 text-text-dark/80 stroke-text-dark/80" />
          </div>
          
        </header>

        {/* --- BODY / ACCORDIONS --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
          {isFetching && groupedExpenses.length === 0 ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl w-full border border-slate-200"></div>
              ))}
            </div>
          ) : groupedExpenses.length > 0 ? (
            <div className="flex flex-col">
              {groupedExpenses.map(([monthStr, data]) => (
                <MonthAccordion key={monthStr} monthStr={monthStr} data={data} />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center flex flex-col items-center justify-center opacity-50">
               <svg className="w-10 h-10 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4m8-8v16" />
               </svg>
               <p className="text-sm-text font-bold text-text-dark/80">No Expenses Logged</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}