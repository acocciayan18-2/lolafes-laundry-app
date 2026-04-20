/**
 * @file useExpenseStore.js
 * @description Enterprise-grade State Management for Monthly Financial Expenses.
 */

import { create } from 'zustand';
import { collection, addDoc, getDocs, query, orderBy, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const useExpenseStore = create((set, get) => ({
  expenses: [],
  isFetching: false,
  error: null,

  // 🚀 Fetch expenses mapped strictly to a specific range
  fetchExpenses: async (startMonthStr, endMonthStr) => {
    set({ isFetching: true, error: null });
    try {
      const expensesRef = collection(db, "expenses");
      const q = query(
        expensesRef,
        where("applicable_month", ">=", startMonthStr),
        where("applicable_month", "<=", endMonthStr),
        orderBy("applicable_month", "desc")
      );
      const snapshot = await getDocs(q);
      const fetchedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedExpenses.sort((a, b) => new Date(b.date_logged) - new Date(a.date_logged));
      set({ expenses: fetchedExpenses, isFetching: false });
    } catch (error) {
      console.error("[ExpenseStore] Fetch Error:", error);
      set({ error: "Failed to load expenses.", isFetching: false });
    }
  },

  // ✨ Fetch the entire history of expenses (Used for dynamic filtering)
  fetchAllExpenses: async () => {
    set({ isFetching: true, error: null });
    try {
      const expensesRef = collection(db, "expenses");
      const q = query(expensesRef, orderBy("applicable_month", "desc"));
      const snapshot = await getDocs(q);
      const fetchedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      fetchedExpenses.sort((a, b) => {
        if (a.applicable_month === b.applicable_month) {
          return new Date(b.date_logged) - new Date(a.date_logged);
        }
        return 0;
      });
      
      set({ expenses: fetchedExpenses, isFetching: false });
    } catch (error) {
      console.error("[ExpenseStore] Fetch All Error:", error);
      set({ error: "Failed to load full expense ledger.", isFetching: false });
    }
  },

  // 🚀 Securely delete an expense
  deleteExpense: async (expenseId) => {
    const { expenses } = get();
    const backup = [...expenses];
    const updatedExpenses = expenses.filter(exp => exp.id !== expenseId);
    set({ expenses: updatedExpenses });

    try {
      const expenseRef = doc(db, "expenses", expenseId);
      await deleteDoc(expenseRef);
      return { success: true };
    } catch (error) {
      console.error("[ExpenseStore] Delete Error:", error);
      set({ expenses: backup });
      return { success: false, error: "Failed to delete from database." };
    }
  },

  // ✨ NEW: Securely EDIT a past or future expense
  updateExpense: async (expenseId, updatedData) => {
    try {
      const amount = parseFloat(updatedData.amount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid expense amount.");
      if (!updatedData.applicable_month) throw new Error("Applicable month is required.");

      const payload = {
        amount: amount,
        category: String(updatedData.category).substring(0, 50),
        applicable_month: String(updatedData.applicable_month).substring(0, 7),
        notes: String(updatedData.notes || "").substring(0, 250),
      };

      // Optimistic UI Update (Makes the UI feel instantly responsive)
      const { expenses } = get();
      set({
        expenses: expenses.map(exp => exp.id === expenseId ? { ...exp, ...payload } : exp)
      });

      // Background sync to Firebase
      const expenseRef = doc(db, "expenses", expenseId);
      await updateDoc(expenseRef, payload);

      return { success: true };
    } catch (error) {
      console.error("[ExpenseStore] Update Error:", error);
      get().fetchAllExpenses(); // Revert on failure by re-fetching truth
      return { success: false, error: error.message };
    }
  },

  // 🚀 Securely log a new expense
  addExpense: async (expenseData, loggedBy = "admin") => {
    try {
      const amount = parseFloat(expenseData.amount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid expense amount.");
      if (!expenseData.applicable_month) throw new Error("Applicable month is required.");

      const newExpense = {
        amount: amount,
        category: String(expenseData.category).substring(0, 50),
        applicable_month: String(expenseData.applicable_month).substring(0, 7),
        date_logged: new Date().toISOString(),
        notes: String(expenseData.notes || "").substring(0, 250),
        logged_by: loggedBy,
        staff_id: expenseData.staff_id || null
      };

      const tempId = `temp_${Date.now()}`;
      set(state => ({ expenses: [{ id: tempId, ...newExpense }, ...state.expenses] }));

      const docRef = await addDoc(collection(db, "expenses"), newExpense);

      set(state => ({
        expenses: state.expenses.map(exp => exp.id === tempId ? { ...exp, id: docRef.id } : exp)
      }));

      return { success: true };
    } catch (error) {
      console.error("[ExpenseStore] Add Error:", error);
      return { success: false, error: error.message };
    }
  }
}));