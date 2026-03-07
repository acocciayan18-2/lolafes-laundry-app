import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useState, useMemo, useCallback } from "react";
import CustomerCard from "../components/customers/CustomerCard";
import CustomerStats from "../components/customers/CustomerStats";
import { IconSearch, IconUsers, IconClose } from "../components/icons";
import { useCustomerStore } from "../store/customer/useCustomerStore";
import { CustomerListSkeleton } from "../components/skeleton-loader";
import EditCustomerModal from "../components/customers/EditCustomerModal"; 
import StoreGuard from '../components/settings/StoreGuard';

// 1. PERFORMANCE: Extract static config
const SMOOTH_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01 
};

// 2. ACCESSIBILITY: Add proper standard attributes to custom input
const Input = ({ className, ...props }) => (
  <input 
    className={`flex h-12 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} 
    {...props} 
  />
);

export default function Customers() {
  const { customers, isLoading, subscribeToCustomers } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Handle Firebase Subscription
  useEffect(() => {
    const unsubscribe = subscribeToCustomers();
    return () => unsubscribe();
  }, [subscribeToCustomers]);

  // SKELETON DELAY LOGIC
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        setShouldShowSkeleton(true);
      }, 400); 
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer); 
  }, [isLoading]);

  // 3. SECURE UX: Global Search Keydown Handler
  useEffect(() => {
    const handleGlobalSearchFocus = (e) => {
      const activeElement = document.activeElement;
      const isAlreadyTyping = 
        activeElement.tagName === "INPUT" || 
        activeElement.tagName === "TEXTAREA" || 
        activeElement.isContentEditable;

      if (isAlreadyTyping) return;

      // Only intercept actual characters, not Control, Command, Alt, or special keys
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const searchInput = document.getElementById("customer-search-input");
        if (searchInput) {
          // Focus first, THEN append the key to ensure the cursor stays at the end of the text
          searchInput.focus();
          setSearchTerm(prev => prev + e.key);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalSearchFocus);
    return () => window.removeEventListener("keydown", handleGlobalSearchFocus);
  }, []); // Removed setSearchTerm from dependency array to prevent memory leaks

  // ==========================================
  // 4. PERFORMANCE: Memoized Search Filter
  // Prevents the app from freezing when typing if there are thousands of customers
  // ==========================================
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchTerm.trim()) return customers; // Fast exit if no search
    
    const term = searchTerm.toLowerCase();
    
    return customers.filter(customer => {
      // Optional Chaining protects against corrupted data where a field might be missing
      return (
        customer.name?.toLowerCase().includes(term) ||
        customer.phone?.includes(term) ||
        customer.address?.toLowerCase().includes(term)
      );
    });
  }, [customers, searchTerm]);

  // Clean handler to prevent inline function recreation
  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    document.getElementById("customer-search-input")?.focus();
  }, []);

  // --- RENDERING LOGIC ---

  if (isLoading && shouldShowSkeleton) {
    return <CustomerListSkeleton />;
  }

  if (isLoading && !shouldShowSkeleton) {
    return null;
  }

  return (
     <StoreGuard>
        <div className="min-h-screen bg-app-light p-2">
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
        <div className="relative w-full mb-3 group">
          <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 pointer-events-none z-10 transition-colors" />
          <Input
            id="customer-search-input"
            type="text"
            placeholder="Search name, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="!pl-10 !pr-10 bg-white rounded-xl shadow-sm border-slate-200 focus:!border-gray-900 focus:!ring-0 w-full"
            aria-label="Search customers"
          />
          {/* 5. UX ENHANCEMENT: Quick clear button for the search bar */}
          <AnimatePresence>
            {searchTerm && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleClearSearch}
                className="absolute right-2 top-1 bottom-1 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600  rounded-lg transition-colors"
                aria-label="Clear search"
              >
                <IconClose className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <CustomerStats customers={customers} />

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
                    <CustomerCard 
                      customer={customer} 
                      onEdit={() => setEditingCustomer(customer)}
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

        {/* Modal Logic */}
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
     </div>
      </StoreGuard>
  );
}