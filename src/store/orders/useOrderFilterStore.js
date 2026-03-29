import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 1. SECURITY & VALIDATION: Define strict allowed values
// This prevents crashes if a user tampers with their browser's local storage
const VALID_STATUSES = ["all", "pending", "in_progress", "ready", "completed", "picked_up", "delivered"];
const VALID_DATES = ["all", "today", "yesterday", "last_7", "last_30"];

export const useOrderFilterStore = create(
  persist(
    (set, get) => ({
      searchTerm: "",
      statusFilter: "all",
      dateFilter: "today",

      // 2. SANITIZATION: Ensure only valid strings enter the state
      setSearchTerm: (val) => {
        if (typeof val === 'string') {
          set({ searchTerm: val });
        }
      },
      
      setStatusFilter: (val) => {
        if (VALID_STATUSES.includes(val)) {
          set({ statusFilter: val });
        } else {
          console.warn(`Security/Validation warning: Invalid status filter attempt ('${val}')`);
          set({ statusFilter: "all" }); // Safe fallback
        }
      },
      
      setDateFilter: (val) => {
        if (VALID_DATES.includes(val)) {
          set({ dateFilter: val });
        } else {
          console.warn(`Security/Validation warning: Invalid date filter attempt ('${val}')`);
          set({ dateFilter: "today" }); // Safe fallback
        }
      },
      
      // Reset function for a "Clear All" button
      resetFilters: () => set({ 
        searchTerm: "", 
        statusFilter: "all", 
        dateFilter: "today" 
      }),

      // 3. ADDED FUNCTIONALITY: Helper to easily check if UI should show a "Clear Filters" button
      hasActiveFilters: () => {
        const state = get();
        return state.searchTerm.trim() !== "" || state.statusFilter !== "all" || state.dateFilter !== "today";
      }
    }),
    {
      name: 'lolafe-order-filter-storage', 
      
      // 4. UX & PERFORMANCE FIX: Partialize the state
      // We ONLY save dropdown choices to localStorage. The text search bar is wiped clean on browser refresh.
      partialize: (state) => ({ 
        statusFilter: state.statusFilter, 
        dateFilter: state.dateFilter 
      }),
    }
  )
);