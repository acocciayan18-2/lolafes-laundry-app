import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useState } from "react";
import CustomerCard from "../components/customers/CustomerCard";
import CustomerStats from "../components/customers/CustomerStats";
import { IconSearch, IconUsers } from "../components/icons";
import { useCustomerStore } from "../store/customer/useCustomerStore";
import { CustomerListSkeleton } from "../components/skeleton-loader";

//TOUR
import { useLocation, useNavigate } from 'react-router-dom';
import { startGlobalTour } from '../tours/globalTours';


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
  const location = useLocation();
  const navigate = useNavigate();




  const { customers, isLoading, subscribeToCustomers } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState("");
  
  // New state to control the delayed visibility of the skeleton
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  //Tour logic 
    useEffect(() => {
  const searchParams = new URLSearchParams(location.search);
  const isTourActive = searchParams.get('tour') === 'active';
  
  // Also check if the store is still loading
  if (isTourActive && !isLoading) {
    // INCREASE the timeout. 400ms is often too fast for 
    // Framer Motion + Firebase data fetching.
    const timer = setTimeout(() => {
      console.log("Tour Triggered!"); // Check your console to see if this fires
      startGlobalTour(navigate);
    }, 1200); 

    return () => clearTimeout(timer);
  }
}, [location.search, isLoading]); // Added isLoading as a dependency

  // 1. Handle Firebase Subscription
  useEffect(() => {
    const unsubscribe = subscribeToCustomers();
    return () => unsubscribe();
  }, [subscribeToCustomers]);

  // 2. SKELETON DELAY LOGIC:
  // Only set shouldShowSkeleton to true if isLoading persists for more than 500ms
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        setShouldShowSkeleton(true);
      }, 400); // 0.5s delay
    } else {
      setShouldShowSkeleton(false);
    }

    return () => clearTimeout(timer); // Cleanup timer if data loads early
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
  }, [setSearchTerm]);

  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      (customer.phone && customer.phone.includes(term)) ||
      (customer.address && customer.address.toLowerCase().includes(term))
    );
  });

  // --- RENDERING LOGIC ---

  // If we are loading and the 0.5s timer has passed, show skeleton
  if (isLoading && shouldShowSkeleton) {
    return <CustomerListSkeleton />;
  }

  // If we are loading but 0.5s hasn't passed, show nothing (prevents flicker)
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
        <div id="step-cust-search" className="relative w-full mb-3">
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
        <div id="step-cust-stats">
        <CustomerStats customers={customers} />
        </div>

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
                    <CustomerCard customer={customer} />
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
      </div>
    </div>
  );
}