import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import CustomerCard from "../components/customers/CustomerCard";
import CustomerStats from "../components/customers/CustomerStats";
import { IconSearch, IconUsers, IconClose } from "../components/icons";
import { useCustomerStore } from "../store/customer/useCustomerStore";
import { CustomerListSkeleton } from "../components/skeleton-loader";
import EditCustomerModal from "../components/customers/EditCustomerModal"; 
import StoreGuard from '../components/settings/StoreGuard';

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const SMOOTH_TRANSITION = Object.freeze({
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01 
});

const MAX_SEARCH_LENGTH = 100;

// ==========================================
// ATOMIC COMPONENTS
// ==========================================
const Input = React.memo(React.forwardRef(({ className, ...props }, ref) => (
  <input 
    ref={ref}
    className={`flex h-12 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} 
    {...props} 
  />
)));
Input.displayName = "Input";

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function Customers() {
  // --- GLOBAL STATE ---
  const { customers, isLoading, subscribeToCustomers } = useCustomerStore();
  
  // --- LOCAL STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(true); // Default true to prevent flash
  const [editingCustomer, setEditingCustomer] = useState(null);

  // --- REFS ---
  const searchInputRef = useRef(null);
  const isMounted = useRef(false);

  // --- LIFECYCLE ---
  
  useEffect(() => {
    isMounted.current = true;
    let unsubscribe = () => {};
    
    try {
      unsubscribe = subscribeToCustomers();
    } catch (err) {
      console.error("[Customers] Subscription error:", err);
    }
    
    return () => {
      isMounted.current = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribeToCustomers]);

  // Debounced Skeleton Loader (Prevents UI flash on fast networks)
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        if (isMounted.current) setShouldShowSkeleton(true);
      }, 300); 
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer); 
  }, [isLoading]);


  // --- DERIVED STATE (MEMOIZED) ---
  
 // --- DERIVED STATE (MEMOIZED) ---
  
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    
    // 1. Initial Filtering
    const safeTerm = (searchTerm || "").trim().toLowerCase();
    
    let filtered = customers;
    
    if (safeTerm) {
      filtered = customers.filter(customer => {
        if (!customer || typeof customer !== 'object') return false;
        
        // Optional Chaining protects against corrupted data fields
        const name = (customer.name || "").toLowerCase();
        const phone = customer.phone || "";
        const address = (customer.address || "").toLowerCase();

        return (
          name.includes(safeTerm) ||
          phone.includes(safeTerm) ||
          address.includes(safeTerm)
        );
      });
    }

    return [...filtered].sort((a, b) => {
      const nameA = a?.name || "";
      const nameB = b?.name || "";
      return nameA.localeCompare(nameB);
    });
    
  }, [customers, searchTerm]);


  // --- HANDLERS ---

  const handleSearchChange = useCallback((e) => {
    // SECURITY: Sanitize input and enforce max length
    const safeVal = e.target.value.replace(/[<>]/g, "").substring(0, MAX_SEARCH_LENGTH);
    setSearchTerm(safeVal);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  }, []);

  const handleEditClose = useCallback(() => {
    setEditingCustomer(null);
  }, []);


  // --- RENDER EARLY RETURNS ---
  if (isLoading && shouldShowSkeleton) return <CustomerListSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;

  // --- RENDER ---
  return (
    <StoreGuard>
      <main className="min-h-screen bg-app-light p-2" aria-label="Customer Management Dashboard">
        <div className="max-w-6xl mx-auto px-1 md:px-2 relative">
          
          {/* Header */}
          <header className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-h2 font-bold text-text-dark">Customers</h1>
              <p className="text-sm-text text-gray-600 mt-0.5 font-normal">Manage your customer database</p>
            </div>
          </header>

          {/* Search */}
          <section className="relative w-full mb-3 group" aria-label="Customer Search">
            <label htmlFor="customer-search-input" className="sr-only">Search name, phone, or address</label>
            <IconSearch aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 pointer-events-none z-10 transition-colors" />
            <Input
              id="customer-search-input"
              ref={searchInputRef}
              type="search"
              maxLength={MAX_SEARCH_LENGTH}
              placeholder="Search name, phone, or address..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="!pl-10 !pr-10 bg-white rounded-xl shadow-sm border-slate-200 focus:!border-gray-900 focus:!ring-0 w-full focus-visible:ring-2 focus-visible:ring-app-dark"
            />
            
            <AnimatePresence>
              {searchTerm && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1 bottom-1 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50"
                  aria-label="Clear search"
                >
                  <IconClose className="w-4 h-4" aria-hidden="true" />
                </motion.button>
              )}
            </AnimatePresence>
          </section>

          {/* Stats */}
          <CustomerStats customers={Array.isArray(customers) ? customers : []} />

          {/* Customer List */}
          <section aria-label="Customer List" aria-live="polite">
            <LayoutGroup>
              <div className="grid">
                <AnimatePresence mode="popLayout" initial={false}>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => {
                      if (!customer || !customer.id) return null;
                      return (
                        <motion.article
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
                        </motion.article>
                      );
                    })
                  ) : (
                    <motion.div 
                      key="empty"
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-20"
                      role="status"
                    >
                      <div className="flex justify-center mb-4" aria-hidden="true">
                        <IconUsers className="w-12 h-12 text-gray-200" />
                      </div>
                      <h3 className="text-h3  text-text-dark/70 mb-1">
                        {searchTerm ? "No customers found" : "No customers yet"}
                      </h3>
                      <p className="text-sm-text  text-text-dark/40">
                        {searchTerm ? "Try adjusting your search term" : "Customers will appear here when you create orders"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          </section>

          {/* Modal Logic */}
          <AnimatePresence>
            {editingCustomer && (
              <EditCustomerModal 
                customer={editingCustomer} 
                onClose={handleEditClose} 
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </StoreGuard>
  );
}