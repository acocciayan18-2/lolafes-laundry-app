import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { IconUsers, IconSearch } from "../components/icons";
import CustomerStats from "../components/customers/CustomerStats";
import CustomerCard from "../components/customers/CustomerCard";
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
    className={`flex h-12 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} 
    {...props} 
  />
);

export default function Customers() {
  const { customers, isLoading, subscribeToCustomers } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToCustomers();
    return () => unsubscribe();
  }, [subscribeToCustomers]);

  useEffect(() => {
    const handleGlobalSearchFocus = (e) => {
      const activeElement = document.activeElement;
      const isAlreadyTyping = 
        activeElement.tagName === "INPUT" || 
        activeElement.tagName === "TEXTAREA" || 
        activeElement.isContentEditable;

      if (isAlreadyTyping) return;

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const searchInput = document.getElementById("customer-search-input");
        
        if (searchInput) {
          searchInput.focus();
          setSearchTerm(prev => prev + e.key);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalSearchFocus);
    return () => window.removeEventListener("keydown", handleGlobalSearchFocus);
  }, [setSearchTerm]);

  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      (customer.phone && customer.phone.includes(term)) ||
      (customer.address && customer.address.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-app-light p-2">
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div>
            {/* PAGE TITLE: text-h1 */}
            <h1 className="text-h2 font-bold text-text-dark">Customers</h1>
            {/* SUBTITLE: text-sm-text */}
            <p className="text-sm-text text-gray-600 mt-0.5">Manage your customer database</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full mb-3">
          <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <Input
            id="customer-search-input"
            placeholder="Search name, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="!pl-10 bg-white rounded-xl shadow-sm border-slate-200 focus:!border-gray-900 focus:!ring-0 w-full"
          />
        </div>

        {/* Stats */}
        <CustomerStats customers={customers} />

        <LayoutGroup>
          <div className="grid">
            <AnimatePresence mode="popLayout" initial={false}>
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <motion.div 
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/60 rounded-xl h-24 animate-pulse shadow-sm mb-3" 
                  />
                ))
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <motion.div
                    key={customer.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={SMOOTH_TRANSITION}
                  >
                    <CustomerCard customer={customer} />
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20"
                >
                  <div className="flex justify-center mb-4">
                    <IconUsers className="w-12 h-12 text-gray-200" />
                  </div>
                  {/* EMPTY TITLE: text-h3 */}
                  <h3 className="text-h3 font-bold text-text-dark/70 mb-1">
                    {searchTerm ? "No customers found" : "No customers yet"}
                  </h3>
                  {/* EMPTY SUBTEXT: text-sm-text */}
                  <p className="text-sm-text font-medium text-text-dark/40">
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