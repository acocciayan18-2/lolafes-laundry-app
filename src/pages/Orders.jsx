import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { IconShirt, IconPlus } from "../components/icons";
import OrderCard from "../components/orders/OrderCard";
import OrderFilters from "../components/orders/OrderFilters";
import { OrderListSkeleton } from "../components/skeleton-loader";
import { useOrderFilterStore } from "../store/orders/useOrderFilterStore";
import { useOrderStore } from "../store/orders/useOrderStore";
import StoreGuard from "../components/settings/StoreGuard";

// --- CONFIGURATION ---
const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01
};

const PAGE_SIZE = 25; 
const TERMINAL_STATUSES = ['picked_up', 'delivered', 'cancelled']; // Centralized for consistency

// --- UTILITIES ---
// 🛡️ Guard against fatal UI crashes if database fields are missing, null, or wrong types
const safeString = (val) => (val !== null && val !== undefined ? String(val).toLowerCase() : "");

export default function Orders() {
  const { orders, isLoading, subscribeToOrders } = useOrderStore();
  
  const { 
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter, 
    dateFilter, setDateFilter 
  } = useOrderFilterStore();

  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);
  const [tick, setTick] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // 1. Firebase Subscription & Network Guard
  useEffect(() => {
    // Listen for network interruptions
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = subscribeToOrders();
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }; 
  }, [subscribeToOrders]);

  // 2. The Heartbeat Timer (For time-ago updates)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 3. Skeleton Delay Logic (Prevents UI flashing on fast networks)
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 400);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // 4. Robust Global Search Handler
  useEffect(() => {
    const handleGlobalSearchFocus = (e) => {
      const activeElement = document.activeElement;
      const isAlreadyTyping = 
        activeElement.tagName === "INPUT" || 
        activeElement.tagName === "TEXTAREA" || 
        activeElement.isContentEditable;

      if (isAlreadyTyping) return;

      // Ensure we aren't hijacking browser shortcuts (Ctrl+F, etc.)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Safer DOM selector fallback hierarchy
        const searchInput = 
          document.querySelector('input[type="search"]') || 
          document.querySelector('input[type="text"]');
          
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

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [searchTerm, statusFilter, dateFilter]);

  // ==========================================
  // ⚡ PERFORMANCE & DATA GUARDING: useMemo 
  // ==========================================
  const { filteredOrders, hasMoreTerminal } = useMemo(() => {
    // Type checking to prevent array method crashes
    if (!Array.isArray(orders) || orders.length === 0) {
      return { filteredOrders: [], hasMoreTerminal: false };
    }

    let filtered = orders;

    // A. Status Filter
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(order => order?.status === statusFilter);
    }

    // B. Date Filter (Secured against invalid dates)
    if (dateFilter && dateFilter !== "all") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterdayStart = todayStart - 86400000;
      const last7Start = todayStart - (7 * 86400000);
      const last30Start = todayStart - (30 * 86400000);

      filtered = filtered.filter(order => {
        // Fallback to updated_at if created_date is somehow corrupted
        const dateInput = order?.created_date || order?.created_at || order?.updated_at;
        if (!dateInput) return false;
        
        const orderTime = new Date(dateInput).getTime();
        if (isNaN(orderTime)) return false; // Guard against 'Invalid Date' breaking logic

        switch (dateFilter) {
          case "today": return orderTime >= todayStart;
          case "yesterday": return orderTime >= yesterdayStart && orderTime < todayStart;
          case "last_7": return orderTime >= last7Start;
          case "last_30": return orderTime >= last30Start;
          default: return true;
        }
      });
    }

    // C. Search Filter (Secured with safeString)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order =>
        safeString(order.customer_name).includes(lowerTerm) ||
        safeString(order.customer_phone).includes(lowerTerm) ||
        safeString(order.customer_address).includes(lowerTerm) ||
        safeString(order.order_number).includes(lowerTerm) ||
        safeString(order.total_amount).includes(lowerTerm) ||
        safeString(order.status).replace('_', ' ').includes(lowerTerm)
      );
    }

    // D. Split Logic (Active vs Terminal)
    const active = [];
    const terminal = []; 
    
    for (let i = 0; i < filtered.length; i++) {
      const order = filtered[i];
      if (!order) continue; // Skip corrupted null entries

      if (TERMINAL_STATUSES.includes(order.status)) {
        terminal.push(order);
      } else {
        active.push(order);
      }
    }

    // Pagination Slice
    const slicedTerminal = terminal.slice(0, displayLimit);
    const hasMore = terminal.length > displayLimit;

    return { 
      filteredOrders: [...active, ...slicedTerminal], 
      hasMoreTerminal: hasMore 
    };
    
  }, [orders, searchTerm, statusFilter, dateFilter, displayLimit]);

  if (isLoading && shouldShowSkeleton) return <OrderListSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;

  return (
    <StoreGuard> 
      <div className="min-h-screen bg-app-light p-2 pb-4">
        <motion.div layoutRoot className="max-w-6xl mx-auto px-1 md:px-2">
          <LayoutGroup>
            
            {/* Header Section */}
            <motion.div layout className="flex flex-row items-center justify-between mb-3 gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-h2 text-text-dark">All Orders</h1>
                  {!isLoading && Array.isArray(orders) && (
                    <span className="flex items-center justify-center bg-app-dark/5 px-2 py-0.5 rounded-lg text-micro font-bold text-text-dark/70 uppercase tracking-tighter min-w-[24px]">
                      {orders.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm-text text-gray-600 mt-0.5">Manage and track orders</p>
                  {isOffline && (
                    <span className="text-micro font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full animate-pulse">
                      Offline Mode
                    </span>
                  )}
                </div>
              </div>
              
              <Link to="/main/neworder">
                <button 
                  disabled={isOffline}
                  className="group flex items-center justify-center w-9 h-9 shadow-md bg-white active:bg-app-dark/5 rounded-xl border border-text-dark/20 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconPlus className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>

            {/* Search and Filters Bar */}
            <motion.div layout className="mb-3">
              <OrderFilters 
                statusFilter={statusFilter} 
                setStatusFilter={setStatusFilter}
                dateFilter={dateFilter} 
                setDateFilter={setDateFilter}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
            </motion.div>

            {/* Orders List */}
            <motion.div layout className="flex flex-col overflow-visible">
              <AnimatePresence mode="popLayout">
                {/* ✨ FIX: Removed the Fragment. Conditionals are flattened so AnimatePresence detects individual children correctly. */}
                
                {/* 1. Mapped Orders */}
                {filteredOrders.length > 0 && filteredOrders.map((order, index) => {
                  if (!order || !order.id) return null; 
                  return (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ ...SPRING_TRANSITION, delay: (index % PAGE_SIZE) * 0.02 }}
                    >
                      <OrderCard 
                        order={order} 
                        tick={tick} 
                      />
                    </motion.div>
                  );
                })}

                {/* 2. Load More Button (Given a strict Key) */}
                {filteredOrders.length > 0 && hasMoreTerminal && (
                  <motion.button
                    key="load-more-btn"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}
                    className="w-full mt-2 text-text-dark/70 font-medium text-micro hover:text-text-dark py-3 active:scale-[0.98] transition-all"
                  >
                    Load More Orders
                  </motion.button>
                )}

                {/* 3. Empty State */}
                {filteredOrders.length === 0 && (
                  <motion.div 
                    key="empty-state"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center py-20"
                  >
                    <div className="w-20 h-20 flex items-center justify-center">
                      <IconShirt className="w-10 h-10 text-text-dark/10" />
                    </div>
                    <h3 className="text-h3 font-medium text-text-dark/70">No orders found</h3>
                    <p className="text-sm-text font-medium text-text-dark/50 mt-1">Try adjusting your filters or search term</p>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        </motion.div>
      </div>
    </StoreGuard>
  );
}