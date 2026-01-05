import React, { useState, useEffect } from "react";
// 1. Import Framer Motion
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { IconUsers, IconSearch } from "../components/icons";
import CustomerStats from "../components/customers/CustomerStats";
import CustomerCard from "../components/customers/CustomerCard";

// Smooth spring transition to match the Services page
const SMOOTH_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01 
};

// Mock Data
const MOCK_CUSTOMERS = [
  { id: 1, name: "Juan Dela Cruz", phone: "09123456789", address: "Unit 101, Taguig City", created_date: new Date().toISOString() },
  { id: 2, name: "Maria Clara", phone: "09987654321", address: "BGC, Taguig", created_date: new Date().toISOString() },
  { id: 3, name: "Jose Rizal", phone: "09111112222", address: "Laguna", created_date: "2023-12-01T10:00:00Z" },
  { id: 4, name: "Andres Bonifacio", phone: "09223334444", address: "Tondo, Manila", created_date: "2023-11-15T08:30:00Z" },
];

const Input = ({ className, ...props }) => (
  <input 
    className={`flex h-12 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} 
    {...props} 
  />
);

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setCustomers(MOCK_CUSTOMERS);
    setIsLoading(false);
  };

  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      customer.phone.includes(term) ||
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

        {/* Stats */}
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