/**
 * @file ProfitHealthWidget.jsx
 * @description Master ledger for viewing, filtering, deleting, and editing business overhead.
 * @architecture Implements Headless UI Listbox, Full-Hitbox Calendar, and React.memo optimizations.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { useExpenseStore } from '../../store/expenses/useExpenseStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { useActivityStore } from '../../store/activities/useActivityStore';
import AddExpenseModal from './AddExpenseModal'; 
import { 
  IconTrash, IconX, IconCheckWhite, IconArrowUp,
  IconAllCategories, IconBolt, IconDroplet, IconHome, 
  IconWallet, IconPen, IconWrench, IconLightbulb, IconLayout 
} from '../icons';

// Frozen constant mapped with our new custom SVG React components
const CATEGORY_MAP = Object.freeze({
  all: { label: "All Categories", icon: <IconAllCategories className="w-4 h-4 shrink-0" /> },
  electricity: { label: "Electricity", icon: <IconBolt className="w-4 h-4 shrink-0" /> },
  water: { label: "Water Bill", icon: <IconDroplet className="w-4 h-4 shrink-0" /> },
  rent: { label: "Space Rent", icon: <IconHome className="w-4 h-4 shrink-0" /> },
  payroll: { label: "Staff Payroll", icon: <IconWallet className="w-4 h-4 shrink-0" /> },
  supplies_manual: { label: "Bulk Supplies", icon: <IconPen className="w-4 h-4 shrink-0" /> },
  maintenance: { label: "Maintenance", icon: <IconWrench className="w-4 h-4 shrink-0" /> },
  misc: { label: "Miscellaneous", icon: <IconLightbulb className="w-4 h-4 shrink-0" /> },
  supplies_auto: { label: "Auto-Supplies", icon: <IconLayout className="w-4 h-4 shrink-0" /> }
});

export default function ProfitHealthWidget({ onLogExpense }) {
  const expenses = useExpenseStore(state => state.expenses || []);
  const fetchAllExpenses = useExpenseStore(state => state.fetchAllExpenses);
  const isFetching = useExpenseStore(state => state.isFetching);
  const deleteExpense = useExpenseStore(state => state.deleteExpense);
  const showNotification = useNotificationStore(state => state.showNotification);
  const logActivity = useActivityStore(state => state.logActivity);
  
  // States
  const [deletingId, setDeletingId] = useState(null);
  const [monthFilter, setMonthFilter] = useState(""); 
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Local Edit State
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  // Fetch ALL expenses on mount
  useEffect(() => {
    fetchAllExpenses();
  }, [fetchAllExpenses]);

  // Smart Filter Engine
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchMonth = monthFilter ? exp.applicable_month === monthFilter : true;
      const matchCat = categoryFilter !== "all" ? exp.category === categoryFilter : true;
      return matchMonth && matchCat;
    });
  }, [expenses, monthFilter, categoryFilter]);

  const totalFilteredOverhead = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredExpenses]);

  // Handlers
  const handleDelete = useCallback(async (id) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    const result = await deleteExpense(id);
    
    if (result.success) {
      if (expenseToDelete) {
        const catLabel = CATEGORY_MAP[expenseToDelete.category]?.label || "Miscellaneous";
        const formattedAmount = Number(expenseToDelete.amount).toLocaleString(undefined, { minimumFractionDigits: 2 });
        
        logActivity(
          { customer_name: "Overhead Ledger", order_number: "EXPENSE", total_amount: expenseToDelete.amount },
          "Removed",
          { action: "deleted", label: `Deleted ₱${formattedAmount} for ${catLabel}` }
        );
      }

      showNotification("Expense record permanently removed.", "success");
      setDeletingId(null);
    } else {
      showNotification(result.error || "Failed to remove record.", "error");
    }
  }, [expenses, deleteExpense, logActivity, showNotification]);

  const handleOpenDatePicker = useCallback((e) => {
    try {
      if (e.target && typeof e.target.showPicker === 'function') {
        e.target.showPicker();
      }
    } catch (err) {
      // Silently fail if browser doesn't support showPicker
    }
  }, []);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible mb-3 flex flex-col" aria-label="Profit health and overhead management widget">
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30">
        <div>
          <h2 className="text-base-text font-bold text-slate-800 mb-1">Overhead Monthly Expenses</h2>
          <p className="text-sm-text text-text-dark/80">
            Total Amount: <span className="font-bold text-rose-600">₱{totalFilteredOverhead.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
        
        <button
          onClick={onLogExpense}
          className="bg-app-dark text-white hover:bg-app-dark/90 px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 shadow-sm focus:outline-none active:scale-95 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Log New Expense
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-slate-50 border-b border-slate-100 p-4 px-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Month Filter */}
        <div className="flex flex-col relative">
          <label htmlFor="month-filter" className="text-nano font-bold text-text-dark/80 uppercase tracking-widest mb-1.5 ml-1">Filter by Month</label>
          <div className="flex items-center gap-2 relative">
            <input 
              id="month-filter"
              type="month" 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              onClick={handleOpenDatePicker}
              className="w-full text-sm-text  text-text-dark bg-white border border-slate-200 rounded-xl px-4 h-[42px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:left-0"
            />
            <AnimatePresence>
              {monthFilter && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setMonthFilter("")} 
                  className="absolute right-2 text-micro font-bold text-slate-400 hover:text-text-dark bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 rounded-lg whitespace-nowrap z-10 transition-colors"
                  aria-label="Clear month filter"
                >
                  Clear
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Category Filter (Headless UI) */}
        <div className="flex flex-col relative z-20">
          <label id="category-filter-label" className="text-nano font-bold text-text-dark/80 uppercase tracking-widest mb-1.5 ml-1">Filter by Category</label>
          <Listbox value={categoryFilter} onChange={setCategoryFilter}>
            {({ open }) => (
              <>
                <ListboxButton 
                  aria-labelledby="category-filter-label"
                  className={`flex h-[42px] w-full items-center justify-between rounded-xl border bg-white px-4 text-sm-text focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${open ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex items-center gap-2.5 text-text-dark truncate">
                    <span className="text-text-dark/80" aria-hidden="true">{CATEGORY_MAP[categoryFilter]?.icon}</span>
                    <span className="truncate">{CATEGORY_MAP[categoryFilter]?.label}</span>
                  </div>
                  <IconArrowUp className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-0' : 'rotate-180'}`} aria-hidden="true" />
                </ListboxButton>
                <AnimatePresence>
                  {open && (
                    <ListboxOptions 
                      static 
                      as={motion.ul} 
                      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} 
                      className="absolute top-full mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-2 shadow-xl border border-slate-100 focus:outline-none custom-scrollbar z-999"
                    >
                      {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
                        <ListboxOption 
                          key={key} 
                          value={key} 
                          className={({ active }) => `relative cursor-pointer select-none py-2.5 px-4 text-sm-text transition-colors flex items-center justify-between ${active ? 'bg-slate-50 text-slate-900' : 'text-text-dark'}`}
                        >
                          {({ selected }) => (
                            <>
                              <div className="flex items-center gap-2.5 truncate">
                                <span className={selected ? "text-blue-600" : "text-text-dark/80"}>{cat.icon}</span>
                                <span className={`block truncate ${selected ? 'font-bold text-blue-600' : 'font-medium'}`}>{cat.label}</span>
                              </div>
                              {selected && <IconCheckWhite className="w-4 h-4 text-blue-600 fill-current shrink-0" aria-hidden="true" />}
                            </>
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
      </div>

      {/* EXPENSE TABLE */}
      <div className="flex-1 overflow-y-auto max-h-[200px] rounded-xl custom-scrollbar bg-white relative z-10">
        {isFetching && expenses.length === 0 ? (
          <div className="p-10 text-center text-slate-400  ">Synchronizing ledger...</div>
        ) : filteredExpenses.length > 0 ? (
          <table className="w-full text-left border-collapse" aria-label="Business expense records">
            <thead className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-slate-100 z-10 shadow-sm">
              <tr className="text-nano font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3">Month</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Notes</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredExpenses.map((expense) => {
                const isConfirming = deletingId === expense.id;
                const category = CATEGORY_MAP[expense.category] || CATEGORY_MAP.misc;
                
                const formattedMonth = expense.applicable_month 
                  ? new Date(`${expense.applicable_month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  : "Unknown";

                return (
                  <tr key={expense.id} className={`hover:bg-slate-50/50 transition-colors ${isConfirming ? 'bg-rose-50/50' : ''}`}>
                    <td className="px-6 py-3 text-sm-text text-text-dark whitespace-nowrap">
                      {formattedMonth}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-slate-400" aria-hidden="true">{category.icon}</span>
                        <span className="text-sm-text text-text-dark">{category.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm-text text-text-dark/80 max-w-[200px] truncate" title={expense.notes}>
                      {expense.notes || <span className="italic opacity-40">No description</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-sm-text text-rose-600">
                        ₱{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <AnimatePresence mode="wait">
                          {isConfirming ? (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-2">
                              <button onClick={() => handleDelete(expense.id)} aria-label="Confirm delete" className="p-1.5 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors"><IconCheckWhite className="w-4 h-4" /></button>
                              <button onClick={() => setDeletingId(null)} aria-label="Cancel delete" className="p-1.5 bg-slate-200 text-text-dark rounded-md hover:bg-slate-300 transition-colors"><IconX className="w-4 h-4" /></button>
                            </motion.div>
                          ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1">
                              {/* EDIT BUTTON */}
                              <button onClick={() => setExpenseToEdit(expense)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit Expense">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              {/* DELETE BUTTON */}
                              <button onClick={() => setDeletingId(expense.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete Expense">
                                <IconTrash className="w-4 h-4" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center flex flex-col items-center">
            <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-sm-text font-bold text-text-dark/80">No expenses found for this filter</p>
          </div>
        )}
      </div>

      {/* RENDER EDIT MODAL LOCALLY */}
      <AddExpenseModal 
        isOpen={!!expenseToEdit} 
        expenseToEdit={expenseToEdit} 
        onClose={() => setExpenseToEdit(null)} 
      />
    </section>
  );
}