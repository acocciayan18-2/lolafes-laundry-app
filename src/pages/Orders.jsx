import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { IconShirt, IconPlus } from "../components/icons";
import OrderCard from "../components/orders/OrderCard";
import OrderFilters from "../components/orders/OrderFilters";
import { OrderListSkeleton } from "../components/skeleton-loader";
import { useOrderFilterStore } from "../store/orders/useOrderFilterStore";
import { useOrderStore } from "../store/orders/useOrderStore";
import StoreGuard from "../components/settings/StoreGuard";

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const SPRING_TRANSITION = Object.freeze({
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01
});

const PAGE_SIZE = 25; 
const TERMINAL_STATUSES = Object.freeze(['picked_up', 'delivered', 'cancelled']);

// ==========================================
// UTILITIES
// ==========================================
/**
 * @description Defensively converts mixed payload types to a lowercased string for search.
 */
const safeString = (val) => {
  if (val === null || val === undefined) return "";
  return String(val).toLowerCase();
};

/**
 * @description Extracts and validates timestamp from an order object.
 */
const getOrderTimestamp = (order) => {
  const dateInput = order?.created_date || order?.created_at || order?.updated_at;
  if (!dateInput) return null;
  const time = new Date(dateInput).getTime();
  return isNaN(time) ? null : time;
};


// ==========================================
// MAIN COMPONENT
// ==========================================
export default function Orders() {
  // --- GLOBAL STATE ---
  const { orders, isLoading, subscribeToOrders } = useOrderStore();
  const { 
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter, 
    dateFilter, setDateFilter 
  } = useOrderFilterStore();

  // --- LOCAL STATE ---
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(true); // Default true prevents flash
  const [tick, setTick] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [isOffline, setIsOffline] = useState(false); // Default false, checked in effect for SSR safety
  
  // --- REFS ---
  const isMounted = useRef(false);

  // --- LIFECYCLE ---
  
  // 1. Network Guard & DB Subscription
  useEffect(() => {
    isMounted.current = true;
    setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine);

    const handleOnline = () => { if (isMounted.current) setIsOffline(false); };
    const handleOffline = () => { if (isMounted.current) setIsOffline(true); };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeToOrders();
    } catch (err) {
      console.error("[Orders] Subscription failed:", err);
    }
    
    return () => {
      isMounted.current = false;
      if (typeof unsubscribe === 'function') unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }; 
  }, [subscribeToOrders]);

  // 2. Heartbeat Timer (For accurate time-ago updates without re-fetching data)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted.current) setTick(t => t + 1);
    }, 10000); // PERF: 10s is sufficient, 5s is overly aggressive for background tabs
    return () => clearInterval(interval);
  }, []);

  // 3. Debounced Skeleton Loader (Prevents flash on instant cache hits)
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

  // 4. Reset Pagination on Filter Change
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [searchTerm, statusFilter, dateFilter]);


  // ==========================================
  // DATA PIPELINE: MEMOIZED FILTERING
  // ==========================================
  const { filteredOrders, hasMoreTerminal, totalCount } = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return { filteredOrders: [], hasMoreTerminal: false, totalCount: 0 };
    }

    let active = [];
    let terminal = [];
    const safeSearchTerm = searchTerm ? searchTerm.toLowerCase().trim() : "";
    
    // Date pre-calculations
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const last7Start = todayStart - (7 * 86400000);
    const last30Start = todayStart - (30 * 86400000);

    // O(N) Single-Pass Pipeline: Filter, Split, and Collect
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (!order || typeof order !== 'object') continue;

      // A. Status Check
      if (statusFilter && statusFilter !== "all" && order.status !== statusFilter) continue;

      // B. Date Check
      if (dateFilter && dateFilter !== "all") {
        const orderTime = getOrderTimestamp(order);
        if (!orderTime) continue;

        let dateMatch = false;
        switch (dateFilter) {
          case "today": dateMatch = orderTime >= todayStart; break;
          case "yesterday": dateMatch = orderTime >= yesterdayStart && orderTime < todayStart; break;
          case "last_7": dateMatch = orderTime >= last7Start; break;
          case "last_30": dateMatch = orderTime >= last30Start; break;
          default: dateMatch = true;
        }
        if (!dateMatch) continue;
      }

      // C. Search Check
      if (safeSearchTerm) {
        const searchMatch = 
          safeString(order.customer_name).includes(safeSearchTerm) ||
          safeString(order.customer_phone).includes(safeSearchTerm) ||
          safeString(order.customer_address).includes(safeSearchTerm) ||
          safeString(order.order_number).includes(safeSearchTerm) ||
          safeString(order.total_amount).includes(safeSearchTerm) ||
          safeString(order.status).replace('_', ' ').includes(safeSearchTerm);
        
        if (!searchMatch) continue;
      }

      // D. Split Collection
      if (TERMINAL_STATUSES.includes(order.status)) {
        terminal.push(order);
      } else {
        active.push(order);
      }
    }

    const slicedTerminal = terminal.slice(0, displayLimit);
    const hasMore = terminal.length > displayLimit;

    return { 
      filteredOrders: [...active, ...slicedTerminal], 
      hasMoreTerminal: hasMore,
      totalCount: active.length + terminal.length
    };
    
  }, [orders, searchTerm, statusFilter, dateFilter, displayLimit]);

  
  // --- RENDER EARLY RETURN ---
  if (isLoading && shouldShowSkeleton) return <OrderListSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;

  return (
    <StoreGuard> 
      <main className="min-h-screen bg-app-light p-2 pb-4" aria-label="Order Management Dashboard">
        <motion.div layoutRoot className="max-w-6xl mx-auto px-1 md:px-2">
          <LayoutGroup>
            
            {/* --- HEADER --- */}
            <header>
              <motion.div layout className="flex flex-row items-center justify-between mb-3 gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h1 className="text-h2 text-text-dark">All Orders</h1>
                    {!isLoading && Array.isArray(orders) && (
                      <span 
                        aria-label={`${totalCount} orders found`}
                        className="flex items-center justify-center bg-app-dark/5 px-2 py-0.5 rounded-lg text-micro font-bold text-text-dark/70 uppercase tracking-tighter min-w-[24px]"
                      >
                        {totalCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm-text text-gray-600 mt-0.5 font-normal" aria-hidden="true">Manage and track orders</p>
                    {isOffline && (
                      <span role="alert" className="text-micro font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full animate-pulse">
                        Offline Mode
                      </span>
                    )}
                  </div>
                </div>
                
                <Link to="/main/neworder" aria-label="Create New Order">
                  <button 
                    disabled={isOffline}
                    tabIndex={-1} // Handled by Link wrapper
                    className="group flex items-center justify-center w-9 h-9 shadow-md bg-white active:bg-app-dark/5 rounded-xl border border-text-dark/20 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-app-dark"
                  >
                    <IconPlus className="w-4 h-4" aria-hidden="true" />
                  </button>
                </Link>
              </motion.div>
            </header>

            {/* --- FILTERS --- */}
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

            {/* --- ORDER LIST --- */}
            <motion.div layout className="flex flex-col overflow-visible" role="feed" aria-live="polite" aria-busy={isLoading}>
              <AnimatePresence mode="popLayout">
                
                {/* 1. Mapped Orders */}
                {filteredOrders.length > 0 && filteredOrders.map((order, index) => {
                  if (!order || !order.id) return null; 
                  return (
                    <motion.article
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ ...SPRING_TRANSITION, delay: (index % PAGE_SIZE) * 0.02 }}
                    >
                      <OrderCard order={order} tick={tick} />
                    </motion.article>
                  );
                })}

                {/* 2. Load More Button */}
                {filteredOrders.length > 0 && hasMoreTerminal && (
                  <motion.button
                    key="load-more-btn"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}
                    className="w-full mt-2 text-text-dark/70  text-micro hover:text-text-dark py-3 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark rounded-lg"
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
                    <div className="w-20 h-20 flex items-center justify-center" aria-hidden="true">
                      <IconShirt className="w-10 h-10 text-text-dark/10" />
                    </div>
                    <h3 className="text-h3  text-text-dark/70">No orders found</h3>
                    <p className="text-sm-text  text-text-dark/50 mt-1">Try adjusting your filters or search term</p>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        </motion.div>
      </main>
    </StoreGuard>
  );
}