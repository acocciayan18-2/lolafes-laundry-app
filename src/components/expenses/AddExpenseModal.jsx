/**
 * @file AddExpenseModal.jsx
 * @description Secure UI for logging and editing business expenses.
 * @architecture Implements Headless UI Listbox, Duplicate Prevention, and Audit Logging.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { useExpenseStore } from "../../store/expenses/useExpenseStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
// ✨ NEW: Import the Activity Store for Audit Trails
import { useActivityStore } from "../../store/activities/useActivityStore";
import Button from "../ui/Button";
import { 
  IconClose, IconArrowUp, IconCheckWhite,
  IconBolt, IconDroplet, IconHome, 
  IconWallet, IconPen, IconWrench, IconLightbulb, IconLayout 
} from "../icons";

// Frozen constant mapped with custom SVG React components for dropdown rendering
const EXPENSE_CATEGORIES = Object.freeze({
  electricity: { label: "Electricity", icon: <IconBolt className="w-4 h-4 shrink-0" /> },
  water: { label: "Water Bill", icon: <IconDroplet className="w-4 h-4 shrink-0" /> },
  rent: { label: "Space Rent", icon: <IconHome className="w-4 h-4 shrink-0" /> },
  payroll: { label: "Staff Payroll", icon: <IconWallet className="w-4 h-4 shrink-0" /> },
  supplies_manual: { label: "Bulk Supplies", icon: <IconPen className="w-4 h-4 shrink-0" /> },
  maintenance: { label: "Maintenance", icon: <IconWrench className="w-4 h-4 shrink-0" /> },
  misc: { label: "Miscellaneous", icon: <IconLightbulb className="w-4 h-4 shrink-0" /> },
  supplies_auto: { label: "Auto-Supplies", icon: <IconLayout className="w-4 h-4 shrink-0" /> }
});

export default function AddExpenseModal({ isOpen, onClose, expenseToEdit = null }) {
  // ✨ NEW: Pull existing expenses for Duplicate Checking
  const expenses = useExpenseStore(state => state.expenses || []);
  const addExpense = useExpenseStore(state => state.addExpense);
  const updateExpense = useExpenseStore(state => state.updateExpense);
  const showNotification = useNotificationStore(state => state.showNotification);
  
  // ✨ NEW: Pull Activity Logger
  const logActivity = useActivityStore(state => state.logActivity);

  // Memoize current month to prevent recalculation
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [formData, setFormData] = useState({
    amount: "",
    category: "electricity",
    applicable_month: currentMonthStr,
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-populate form if we are EDITING a past expense
  useEffect(() => {
    if (isOpen && expenseToEdit) {
      setFormData({
        amount: expenseToEdit.amount || "",
        category: EXPENSE_CATEGORIES[expenseToEdit.category] ? expenseToEdit.category : "misc",
        applicable_month: expenseToEdit.applicable_month || currentMonthStr,
        notes: expenseToEdit.notes || ""
      });
    } else if (isOpen && !expenseToEdit) {
      setFormData({ amount: "", category: "electricity", applicable_month: currentMonthStr, notes: "" });
    }
  }, [isOpen, expenseToEdit, currentMonthStr]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    const sanitizedAmount = Number(formData.amount);
    if (isNaN(sanitizedAmount) || sanitizedAmount <= 0) {
      showNotification("Please enter a valid amount greater than 0.", "error");
      setIsSubmitting(false);
      return;
    }

    const safeNotes = (formData.notes || "").trim();

    // ✨ DUPLICATE PREVENTION: Check against existing ledger records
    if (!expenseToEdit) {
      const isDuplicate = expenses.some(exp => 
        Number(exp.amount) === sanitizedAmount && 
        exp.category === formData.category && 
        exp.applicable_month === formData.applicable_month && 
        (exp.notes || "").trim() === safeNotes
      );

      if (isDuplicate) {
        showNotification("Duplicate detected: This exact expense is already logged for this month.", "error");
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
        ...formData,
        notes: safeNotes,
        amount: sanitizedAmount
    };

    let result;
    if (expenseToEdit) {
      result = await updateExpense(expenseToEdit.id, payload);
    } else {
      result = await addExpense(payload);
    }

    if (result.success) {
      // ✨ ACTIVITY LOGGING: Dispatch detailed audit trail event
      const catLabel = EXPENSE_CATEGORIES[formData.category]?.label || "Miscellaneous";
      const formattedAmount = sanitizedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 });
      const actionWord = expenseToEdit ? "Updated" : "Logged";
      
      logActivity(
        { customer_name: "Overhead Ledger", order_number: "EXPENSE", total_amount: sanitizedAmount },
        expenseToEdit ? "Updated" : "Added",
        { action: expenseToEdit ? "updated" : "created", label: `${actionWord} ₱${formattedAmount} for ${catLabel}` }
      );

      showNotification(expenseToEdit ? "Expense record updated." : "Monthly expense logged securely.", "success");
      onClose();
    } else {
      showNotification(result.error || "Failed to process expense.", "error");
    }
    
    setIsSubmitting(false);
  }, [formData, expenseToEdit, isSubmitting, addExpense, updateExpense, onClose, showNotification, expenses, logActivity]);

  const handleOpenDatePicker = useCallback((e) => {
    try {
      if (e.target && typeof e.target.showPicker === 'function') {
        e.target.showPicker();
      }
    } catch (err) {
      // Fail silently if browser doesn't support showPicker
    }
  }, []);

  if (!isOpen) return null;

  const isEditing = !!expenseToEdit;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-modal-title"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full max-w-md bg-white rounded-3xl p-6 relative shadow-2xl"
        >
          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close Modal"
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-text-dark hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-app-dark/20"
          >
            <IconClose className="w-5 h-5" aria-hidden="true" />
          </button>

          <h2 id="expense-modal-title" className="text-xl font-bold text-slate-800 mb-6 pr-8">
            {isEditing ? "Edit Logged Expense" : "Log Monthly Expense"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* AMOUNT INPUT */}
            <div>
              <label htmlFor="expense-amount" className="block text-micro text-text-dark/80 mb-2">Amount (₱)</label>
             <input
                id="expense-amount"
                type="number"
                name="amount"
                min="0.01"
                max="999999"
                step="0.01"
                required
                disabled={isSubmitting}
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full text-lg font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-app-dark/90 disabled:opacity-60"
              />
            </div>

            {/* CATEGORY INPUT (Headless UI Listbox) */}
            <div className="relative z-50">
              <label id="modal-category-label" className="block text-micro text-text-dark/80 mb-2">Category</label>
              <Listbox 
                value={formData.category} 
                onChange={(val) => setFormData(prev => ({ ...prev, category: val }))} 
                disabled={isSubmitting}
              >
                {({ open }) => (
                  <>
                    <ListboxButton 
                      aria-labelledby="modal-category-label"
                      className={`flex w-full items-center justify-between text-sm-text font-bold text-text-dark bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-app-dark/90 disabled:opacity-60 transition-colors ${open ? "border-app-dark ring-1 ring-app-dark/90" : "hover:border-slate-300"}`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-text-dark/80" aria-hidden="true">
                          {EXPENSE_CATEGORIES[formData.category]?.icon}
                        </span>
                        <span className="truncate">
                          {EXPENSE_CATEGORIES[formData.category]?.label}
                        </span>
                      </div>
                      <IconArrowUp className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-0' : 'rotate-180'}`} aria-hidden="true" />
                    </ListboxButton>
                    <AnimatePresence>
                      {open && (
                        <ListboxOptions 
                          static 
                          as={motion.ul} 
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} 
                          className="absolute w-full mt-2 overflow-auto rounded-xl bg-white py-2 shadow-xl border border-slate-100 focus:outline-none custom-scrollbar max-h-52 z-50"
                        >
                          {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => (
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

            {/* APPLICABLE MONTH INPUT (Expanded Click Area) */}
            <div className="relative z-10">
              <label htmlFor="expense-month" className="block text-micro text-text-dark/80 mb-2">Applicable Month</label>
              <div className="relative flex items-center">
                <input
                  id="expense-month"
                  type="month"
                  name="applicable_month"
                  required
                  disabled={isSubmitting}
                  value={formData.applicable_month}
                  onChange={handleChange}
                  onClick={handleOpenDatePicker}
                  className="w-full text-sm-text font-bold text-text-dark bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-app-dark/90 disabled:opacity-60 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:left-0"
                />
              </div>
            </div>

            {/* NOTES INPUT */}
            <div className="relative z-0">
              <label htmlFor="expense-notes" className="block text-micro text-text-dark/80 mb-2">Notes / Description</label>
              <textarea
                id="expense-notes"
                name="notes"
                maxLength="200"
                rows="2"
                disabled={isSubmitting}
                value={formData.notes}
                onChange={handleChange}
                placeholder="E.g., Meralco bill, late payment..."
                className="w-full text-sm-text text-text-dark bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-app-dark/90 disabled:opacity-60"
              />
            </div>

            {/* FORM CONTROLS */}
            <div className="pt-4 flex gap-3 relative z-0">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.amount} className={`flex-1 text-white ${isEditing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-app-dark hover:bg-app-dark/90'}`}>
                {isSubmitting ? "Processing..." : isEditing ? "Save Changes" : "Log Expense"}
              </Button>
            </div>
            
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}