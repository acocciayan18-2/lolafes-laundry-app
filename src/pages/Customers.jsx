import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useState } from "react";
import CustomerCard from "../components/customers/CustomerCard";
import CustomerStats from "../components/customers/CustomerStats";
<<<<<<< HEAD
import EditCustomerModal from "../components/customers/EditCustomerModal"; // Added this
import { IconSearch, IconUsers } from "../components/icons";
import { useCustomerStore } from "../store/customer/useCustomerStore";
import { CustomerListSkeleton } from "../components/skeleton-loader";

// TOUR
import { useLocation, useNavigate } from 'react-router-dom';
import { startGlobalTour } from '../tours/globalTours';
=======
import { IconSearch, IconUsers } from "../components/icons";
import { useCustomerStore } from "../store/customer/useCustomerStore";
import { CustomerListSkeleton } from "../components/skeleton-loader";
import EditCustomerModal from "../components/customers/EditCustomerModal"; 
>>>>>>> Karen2.0

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
<<<<<<< HEAD
  const location = useLocation();
  const navigate = useNavigate();

  const { customers, isLoading, subscribeToCustomers } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);
  
  // NEW: State for handling the Edit Modal
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Tour logic 
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const isTourActive = searchParams.get('tour') === 'active';
    
    if (isTourActive && !isLoading) {
      const timer = setTimeout(() => {
        startGlobalTour(navigate);
      }, 1200); 
      return () => clearTimeout(timer);
    }
  }, [location.search, isLoading, navigate]);
=======
  const { customers, isLoading, subscribeToCustomers } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState("");
  
  // New state to control the delayed visibility of the skeleton
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  // --- NEW: Modal State ---
  const [editingCustomer, setEditingCustomer] = useState(null);
>>>>>>> Karen2.0

  // 1. Handle Firebase Subscription
  useEffect(() => {
    const unsubscribe = subscribeToCustomers();
    return () => unsubscribe();
  }, [subscribeToCustomers]);

<<<<<<< HEAD
  // 2. Skeleton Delay Logic
=======
  // 2. SKELETON DELAY LOGIC:
>>>>>>> Karen2.0
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        setShouldShowSkeleton(true);
      }, 400); 
    } else {
      setShouldShowSkeleton(false);
    }
<<<<<<< HEAD
    return () => clearTimeout(timer);
=======

    return () => clearTimeout(timer); 
>>>>>>> Karen2.0
  }, [isLoading]);

  // 3. Global Search Keydown Handler
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
<<<<<<< HEAD
  }, []);
=======
  }, [setSearchTerm]);
>>>>>>> Karen2.0

  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      (customer.phone && customer.phone.includes(term)) ||
      (customer.address && customer.address.toLowerCase().includes(term))
    );
  });

<<<<<<< HEAD
  // Loading States
=======
  // --- RENDERING LOGIC ---

>>>>>>> Karen2.0
  if (isLoading && shouldShowSkeleton) {
    return <CustomerListSkeleton />;
  }

  if (isLoading && !shouldShowSkeleton) {
    return null;
  }

  return (
    <div className="min-h-screen bg-app-light p-2">
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-h2 font-bold text-text-dark">Customers</h1>
            <p className="text-sm-text text-gray-600 mt-0.5">Manage your customer database</p>
          </div>
        </div>

        {/* Search */}
<<<<<<< HEAD
        <div id="step-cust-search" className="relative w-full mb-3">
=======
        <div className="relative w-full mb-3">
>>>>>>> Karen2.0
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
<<<<<<< HEAD
        <div id="step-cust-stats">
          <CustomerStats customers={customers} />
        </div>

        {/* Customer Cards List */}
=======
        <CustomerStats customers={customers} />

>>>>>>> Karen2.0
        <LayoutGroup>
          <div className="grid">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <motion.div
                    key={customer.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={SMOOTH_TRANSITION}
                  >
<<<<<<< HEAD
                    {/* FIXED: Added onEdit prop here */}
                    <CustomerCard 
                      customer={customer} 
                      onEdit={(cust) => setEditingCustomer(cust)} 
=======
                    {/* --- CONNECTED: onEdit handler --- */}
                    <CustomerCard 
                      customer={customer} 
                      onEdit={() => setEditingCustomer(customer)}
>>>>>>> Karen2.0
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  key="empty"
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20"
                >
                  <div className="flex justify-center mb-4">
                    <IconUsers className="w-12 h-12 text-gray-200" />
                  </div>
                  <h3 className="text-h3 font-bold text-text-dark/70 mb-1">
                    {searchTerm ? "No customers found" : "No customers yet"}
                  </h3>
                  <p className="text-sm-text font-medium text-text-dark/40">
                    {searchTerm ? "Try adjusting your search term" : "Customers will appear here when you create orders"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </LayoutGroup>

<<<<<<< HEAD
        {/* EDIT MODAL OVERLAY */}
=======
        {/* --- NEW: Modal Logic --- */}
>>>>>>> Karen2.0
        <AnimatePresence>
          {editingCustomer && (
            <EditCustomerModal 
              customer={editingCustomer} 
              onClose={() => setEditingCustomer(null)} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}