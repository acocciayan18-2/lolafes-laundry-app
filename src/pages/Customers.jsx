import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { IconUsers, IconSearch } from "../components/icons";
import CustomerStats from "../components/customers/CustomerStats";
import CustomerCard from "../components/customers/CustomerCard";
// 1. Import Store
import { useCustomerStore } from "../store/customer/useCustomerStore";

const SMOOTH_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01 
};

const Input = ({ className, ...props }) => (
  <input 
    className={`flex h-12 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} 
    {...props} 
  />
);

export default function Customers() {
  // 2. Use Zustand Store
  const { customers, isLoading, subscribeToCustomers } = useCustomerStore();
  
  const [searchTerm, setSearchTerm] = useState("");

  // 3. Subscribe on Mount
  useEffect(() => {
    const unsubscribe = subscribeToCustomers();
    return () => unsubscribe();
  }, [subscribeToCustomers]);

  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      (customer.phone && customer.phone.includes(term)) ||
      (customer.address && customer.address.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 md:p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
       <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 mt-1 text-[14px]">Manage your customer database</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full mb-3">
          <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <Input
            placeholder="Search name, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="!pl-10 bg-white/80 rounded-xl shadow-sm border-slate-200 focus:!border-gray-900 focus:!ring-0 w-full"
          />
        </div>

        {/* Stats - Now using real data from store */}
        <CustomerStats customers={customers} />

        {/* List Container with LayoutGroup for synchronized movement */}
        <LayoutGroup>
          <div className="grid gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {isLoading ? (
                // Skeleton Loaders
                Array(4).fill(0).map((_, i) => (
                  <motion.div 
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/60 rounded-xl h-24 animate-pulse shadow-sm" 
                  />
                ))
              ) : filteredCustomers.length > 0 ? (
                // Filtered List
                filteredCustomers.map((customer) => (
                  <motion.div
                    key={customer.id}
                    layout // This makes the card slide when other cards are hidden by search
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={SMOOTH_TRANSITION}
                  >
                    {/* The CustomerCard now handles the disable-click logic */}
                    <CustomerCard customer={customer} />
                  </motion.div>
                ))
              ) : (
                // Empty State
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12 bg-white/50 rounded-xl border border-dashed border-gray-300"
                >
                  <div className="flex justify-center mb-4">
                    <IconUsers className="w-16 h-16 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-500 mb-2">
                    {searchTerm ? "No customers found" : "No customers yet"}
                  </h3>
                  <p className="text-gray-400">
                    {searchTerm ? "Try adjusting your search term" : "Customers will appear here when you create orders"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}