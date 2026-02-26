import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOrderFilterStore = create(
  persist(
    (set) => ({
      searchTerm: "",
      statusFilter: "all",
      dateFilter: "today",

      // Actions to update state
      setSearchTerm: (val) => set({ searchTerm: val }),
      setStatusFilter: (val) => set({ statusFilter: val }),
      setDateFilter: (val) => set({ dateFilter: val }),
      
      // Reset function for a "Clear All" button
      resetFilters: () => set({ 
        searchTerm: "", 
        statusFilter: "all", 
        dateFilter: "today" 
      }),
    }),
    {
      name: 'order-filter-storage', // unique name in localStorage
    }
  )
);