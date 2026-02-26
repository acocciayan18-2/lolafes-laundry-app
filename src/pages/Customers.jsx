import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useState } from "react";
import CustomerCard from "../components/customers/CustomerCard";
import CustomerStats from "../components/customers/CustomerStats";
import { IconSearch, IconUsers, IconPhone, IconMapPin, IconDotsHorizontal } from "../components/icons";
import { useCustomerStore } from "../store/customer/useCustomerStore";
import { CustomerListSkeleton } from "../components/skeleton-loader";
import EditCustomerModal from "../components/customers/EditCustomerModal"; 

import { useLocation, useNavigate } from 'react-router-dom';
import { startGlobalTour } from '../tours/globalTours';

const SMOOTH_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01 
};

export default function Customers() {
  const location = useLocation();
  const navigate = useNavigate();
  const { customers, isLoading, subscribeToCustomers } = useCustomerStore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // --- TOUR DETECTION ---
  const searchParams = new URLSearchParams(location.search);
  const isTourActive = searchParams.get('tour') === 'active';

  // 1. Firebase Subscription
  useEffect(() => {
    const unsubscribe = subscribeToCustomers();
    return () => unsubscribe();
  }, [subscribeToCustomers]);

  // 2. Tour Logic
  useEffect(() => {
    if (isTourActive && !isLoading) {
      const timer = setTimeout(() => {
        startGlobalTour(navigate);
      }, 1200); 
      return () => clearTimeout(timer);
    }
  }, [location.search, isLoading, navigate, isTourActive]);

  // 3. Skeleton Delay
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 400); 
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer); 
  }, [isLoading]);

  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(term) ||
      (customer.phone && customer.phone.includes(term)) ||
      (customer.address && customer.address.toLowerCase().includes(term))
    );
  });

  // Decide if we show a dummy card for the tour
  const showDummyCard = isTourActive && (isLoading || filteredCustomers.length === 0);

  if (isLoading && shouldShowSkeleton && !isTourActive) {
    return <CustomerListSkeleton />;
  }

  return (
    <div className="min-h-screen bg-app-light p-2">
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-h2 font-bold text-text-dark">Customers</h1>
            <p className="text-sm-text text-gray-600 mt-0.5">Manage your customer database</p>
          </div>
        </div>

        <div className="relative w-full mb-3">
          <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <input 
            id="customer-search-input"
            placeholder="Search name, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex h-12 !pl-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm-text placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-all shadow-sm"
          />
        </div>

        <div id="step-cust-stats">
          <CustomerStats customers={customers} />
        </div>

        <LayoutGroup>
          <div className="grid">
            <AnimatePresence mode="popLayout" initial={false}>
              {/* REAL CUSTOMERS */}
              {filteredCustomers.length > 0 && filteredCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={SMOOTH_TRANSITION}
                  id={index === 0 ? "step-customer-card-0" : undefined} // Target first card
                >
                  <CustomerCard 
                    customer={customer} 
                    onEdit={() => setEditingCustomer(customer)}
                    // Pass a custom ID for the ellipses in the card if it's the first one
                    actionId={index === 0 ? "step-customer-actions-0" : undefined}
                  />
                </motion.div>
              ))}

              {/* DUMMY CUSTOMER CARD FOR TOUR */}
              {showDummyCard && (
                <motion.div
                  key="dummy-customer"
                  id="step-customer-card-0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative w-full bg-white p-3 rounded-xl border-2 border-dashed border-app-dark/20 shadow-sm mb-2"
                >
                  <div className="flex items-center gap-4 opacity-60">
                    <div className="w-11 h-11 shrink-0 rounded-full bg-app-dark/5 flex items-center justify-center text-text-dark font-bold border border-app-dark/10">
                      ?
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm-text mb-1">Example Customer</h3>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1"><IconPhone className="w-3 h-3" /> <span className="text-micro">0912 345 6789</span></div>
                        <div className="flex items-center gap-1"><IconMapPin className="w-3 h-3" /> <span className="text-micro">123 Sample St.</span></div>
                      </div>
                    </div>
                    <div id="step-customer-actions-0" className="p-2 rounded-lg bg-gray-50">
                      <IconDotsHorizontal className="w-5 h-5 text-text-dark/40" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* EMPTY STATE (ONLY IF NOT LOADING & NOT IN TOUR) */}
              {!isLoading && !isTourActive && filteredCustomers.length === 0 && (
                 <motion.div key="empty" className="text-center py-20">
                    <IconUsers className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-h3 font-bold text-text-dark/70">No customers found</h3>
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        </LayoutGroup>

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