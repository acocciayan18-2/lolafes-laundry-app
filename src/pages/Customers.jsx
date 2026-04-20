/**
 * @file Customers.jsx
 * @description Enterprise Customer Management Dashboard.
 * @architecture Implements Concurrent Rendering, Render Capping, and Layout-Thrashing Prevention.
 */
import React, { useEffect, useState, useMemo, useCallback, useRef, useDeferredValue } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CustomerCard from "../components/customers/CustomerCard";
import CustomerStats from "../components/customers/CustomerStats";
import { IconSearch, IconUsers, IconClose } from "../components/icons";
import { useCustomerStore } from "../store/customer/useCustomerStore";
import { CustomerListSkeleton } from "../components/skeleton-loader";
import EditCustomerModal from "../components/customers/EditCustomerModal"; 
import StoreGuard from '../components/settings/StoreGuard';
import { useAuthStore } from "../store/auth/useAuthStore";

// ==========================================
// 🛡️ CONFIGURATION & CONSTANTS
// ==========================================
const RENDER_BATCH_SIZE = 50;
const MAX_SEARCH_LENGTH = 100;

// ==========================================
// ⚛️ ATOMIC COMPONENTS
// ==========================================
const Input = React.memo(React.forwardRef(({ className, ...props }, ref) => (
  <input 
    ref={ref}
    className={`flex h-12 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm-text font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} 
    {...props} 
  />
)));
Input.displayName = "Input";

// ==========================================
// 🚀 MAIN CONTROLLER
// ==========================================
export default function Customers() {
  const { customers, isLoading, subscribeToCustomers } = useCustomerStore();
  
  // 🛡️ SECURE RBAC: Direct Memory Access
  const userRole = useAuthStore((state) => state.userRole);
  const isOwnerOrAdmin = useMemo(() => {
    const safeRole = String(userRole || "STAFF").toUpperCase();
    return safeRole === "OWNER" || safeRole === "ADMIN";
  }, [userRole]);

  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  // ⚡ PERFORMANCE: Defer expensive filtering so the input never lags
  const deferredSearchTerm = useDeferredValue(searchTerm); 
  
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(true); 
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  // ⚡ PERFORMANCE: Render cap state to prevent DOM bloat
  const [displayLimit, setDisplayLimit] = useState(RENDER_BATCH_SIZE);

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

  // Reset pagination limit when search term changes
  useEffect(() => {
    setDisplayLimit(RENDER_BATCH_SIZE);
  }, [deferredSearchTerm]);

  // --- DERIVED STATE (O(N) ALGORITHM) ---
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    
    const safeTerm = deferredSearchTerm.trim().toLowerCase();
    
    // Fast path: No search term
    if (!safeTerm) {
      return [...customers].sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    }

    // Filter and Sort in a clean pipeline
    return customers.filter(customer => {
      if (!customer || typeof customer !== 'object') return false;
      return (
        (customer.name || "").toLowerCase().includes(safeTerm) ||
        (customer.phone || "").includes(safeTerm) ||
        (customer.address || "").toLowerCase().includes(safeTerm)
      );
    }).sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    
  }, [customers, deferredSearchTerm]);

  // Slice the array to prevent rendering thousands of nodes at once
  const displayedCustomers = filteredCustomers.slice(0, displayLimit);

  // --- HANDLERS ---
  const handleSearchChange = useCallback((e) => {
    const safeVal = e.target.value.replace(/[&<>'"]/g, "").substring(0, MAX_SEARCH_LENGTH);
    setSearchTerm(safeVal);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  }, []);

  const handleEditClose = useCallback(() => {
    setEditingCustomer(null);
  }, []);

  const handleLoadMore = useCallback(() => {
    setDisplayLimit(prev => prev + RENDER_BATCH_SIZE);
  }, []);

  // --- EARLY RETURN ---
  if (isLoading && shouldShowSkeleton) return <CustomerListSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;

  return (
    <StoreGuard>
      <main className="min-h-screen bg-app-light p-2" aria-label="Customer Management Dashboard">
        <div className="max-w-6xl mx-auto px-1 md:px-2 relative">
          
          <header className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-h2 font-bold text-text-dark">Customers</h1>
              <p className="text-sm-text text-gray-600 mt-0.5 font-normal">Manage your customer database</p>
            </div>
          </header>

          <section className="relative w-full mb-3 group" aria-label="Customer Search">
            {/* CSS Hack: Hide native browser search clear icons */}
            <style dangerouslySetInnerHTML={{__html: `
              #customer-search-input::-webkit-search-decoration,
              #customer-search-input::-webkit-search-cancel-button,
              #customer-search-input::-ms-clear { display: none; }
            `}} />

            <label htmlFor="customer-search-input" className="sr-only">Search name, phone, or address</label>
            <IconSearch aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 pointer-events-none z-10 transition-colors" />
            
            <Input
              id="customer-search-input"
              ref={searchInputRef}
              type="text" 
              maxLength={MAX_SEARCH_LENGTH}
              placeholder="Search name, phone, or address..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="!pl-10 !pr-10 bg-white rounded-xl border-slate-200 focus:!border-gray-900 focus:!ring-0 w-full focus-visible:ring-2 focus-visible:ring-app-dark"
            />
            
            <AnimatePresence>
              {searchTerm && (
                <motion.button 
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1 bottom-1 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50"
                  aria-label="Clear search"
                >
                  <IconClose className="w-4 h-4" aria-hidden="true" />
                </motion.button>
              )}
            </AnimatePresence>
          </section>

          {/* A11y: Visually hidden live region to announce search results */}
          <div aria-live="polite" className="sr-only">
             {filteredCustomers.length} customers found.
          </div>

          <CustomerStats customers={Array.isArray(customers) ? customers : []} />

          <section aria-label="Customer List">
            <div className="grid">
              <AnimatePresence initial={false}>
                {displayedCustomers.length > 0 ? (
                  displayedCustomers.map((customer) => {
                    if (!customer || !customer.id) return null;
                    return (
                      <motion.article
                        key={customer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CustomerCard 
                          customer={customer} 
                          onEdit={isOwnerOrAdmin ? setEditingCustomer : undefined}
                        />
                      </motion.article>
                    );
                  })
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-20"
                    role="status"
                  >
                    <div className="flex justify-center mb-4" aria-hidden="true">
                      <IconUsers className="w-12 h-12 text-gray-200" />
                    </div>
                    <h3 className="text-base-text text-text-dark/70 mb-1">
                      {searchTerm ? "No customers found" : "No customers yet"}
                    </h3>
                    <p className="text-sm-text text-text-dark/40">
                      {searchTerm ? "Try adjusting your search term" : "Customers will appear here when you create orders"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Load More Button */}
            {filteredCustomers.length > displayLimit && (
              <div className="pt-4 pb-10 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm-text font-bold text-text-dark hover:bg-slate-50 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  Load More Customers ({filteredCustomers.length - displayLimit} remaining)
                </button>
              </div>
            )}
          </section>

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