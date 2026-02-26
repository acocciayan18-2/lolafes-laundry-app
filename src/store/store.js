import { create } from 'zustand';

export const useStore = create((set) => ({
  orders: [],
  customers: [],
  isLoading: true,
  
  // Actions
  setOrders: (orders) => set({ orders }),
  setCustomers: (customers) => set({ customers }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));