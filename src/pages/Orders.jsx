import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { IconAddNewOrder, IconShirt } from "../components/icons";
import OrderCard from "../components/orders/OrderCard";
import OrderFilters from "../components/orders/OrderFilters";
import { OrderListSkeleton } from "../components/skeleton-loader";
import { useOrderFilterStore } from "../store/orders/useOrderFilterStore";
import { useOrderStore } from "../store/orders/useOrderStore";
import StoreGuard from "../components/settings/StoreGuard";

const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01
};

const PAGE_SIZE = 25; 

export default function Orders() {
 const { orders, isLoading, subscribeToOrders } = useOrderStore();
  
  const { 
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter, 
    dateFilter, setDateFilter 
  } = useOrderFilterStore();

  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);
  const [tick, setTick] = useState(0);

  // ✨ PAGINATION STATE
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  // 1. Firebase Subscription
  useEffect(() => {
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe(); 
  }, [subscribeToOrders]);

  // 2. The Heartbeat Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 3. Skeleton Delay Logic
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 400);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // 4. Global Search Handler
  useEffect(() => {
    const handleGlobalSearchFocus = (e) => {
      const activeElement = document.activeElement;
      const isAlreadyTyping = 
        activeElement.tagName === "INPUT" || 
        activeElement.tagName === "TEXTAREA" || 
        activeElement.isContentEditable;

      if (isAlreadyTyping) return;

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const searchInput = document.querySelector('input[placeholder*="Search name"]') || document.querySelector('input[type="text"]');
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

  // ✨ RESET PAGINATION WHEN FILTERS CHANGE
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [searchTerm, statusFilter, dateFilter]);


  // ==========================================
  // PERFORMANCE: useMemo for Derived State
  // ==========================================
 const { filteredOrders, hasMoreTerminal } = useMemo(() => {
    if (!orders || orders.length === 0) return { filteredOrders: [], hasMoreTerminal: false };

    let filtered = orders;

    // A. Status Filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // B. Date Filter
    if (dateFilter !== "all") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterdayStart = todayStart - 86400000;
      const last7Start = todayStart - (7 * 86400000);
      const last30Start = todayStart - (30 * 86400000);

      filtered = filtered.filter(order => {
        if (!order.created_date) return false;
        const orderTime = new Date(order.created_date).getTime();
        switch (dateFilter) {
          case "today": return orderTime >= todayStart;
          case "yesterday": return orderTime >= yesterdayStart && orderTime < todayStart;
          case "last_7": return orderTime >= last7Start;
          case "last_30": return orderTime >= last30Start;
          default: return true;
        }
      });
    }

    // C. Search Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        (order.customer_name?.toLowerCase().includes(lowerTerm)) ||
        (order.customer_phone?.includes(lowerTerm)) ||
        (order.customer_address?.toLowerCase().includes(lowerTerm)) ||
        (order.order_number?.toLowerCase().includes(lowerTerm)) ||
        (order.total_amount?.toString().includes(lowerTerm)) ||
        (order.status?.toLowerCase().replace('_', ' ').includes(lowerTerm))
      );
    }

    // D. Split Logic
    const active = [];
    const terminal = []; 
    
    for (let i = 0; i < filtered.length; i++) {
      if (['picked_up', 'delivered'].includes(filtered[i].status)) {
        terminal.push(filtered[i]);
      } else {
        active.push(filtered[i]);
      }
    }

    // ✨ PAGINATION SLICE: Show all active, but limit the terminal ones
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
    <div className="min-h-screen bg-app-light p-2 pb-20">
      <motion.div layoutRoot className="max-w-6xl mx-auto px-1 md:px-2">
        <LayoutGroup>
          
          {/* Header Section */}
          <motion.div layout className="flex flex-row items-center mb-3 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-h2 text-text-dark">All Orders</h1>
                {!isLoading && (
                  <span className="flex items-center justify-center bg-app-dark/5 px-2 py-0.5 rounded-lg text-micro font-bold text-text-dark/70 uppercase tracking-tighter min-w-[24px]">
                    {orders.length} {/* ✨ Switched to total raw orders for accuracy */}
                  </span>
                )}
              </div>
              <p className="text-sm-text text-gray-600 mt-0.5">Manage and track orders</p>
            </div>
            
            <Link to="/main/neworder">
              <button className="group flex items-center justify-center w-9 h-9 shadow-md bg-white  active:bg-app-dark/5 rounded-xl border border-text-dark/20 active:scale-95 transition-all duration-200">
                <IconAddNewOrder className="w-5 h-5" />
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
               {filteredOrders.length > 0 ? (
                 <>
                   {filteredOrders.map((order, index) => (
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
                   ))}

                   {hasMoreTerminal && (
                     <motion.button
                       layout
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}
                       className="w-full py-2 mt-2 rounded-xl border-2 border-dashed border-slate-300 text-text-dark/70 font-normal text-micro hover:bg-slate-50 hover:text-text-dark hover:border-slate-400 active:scale-[0.98] transition-all"
                     >
                       Load More Order 
                     </motion.button>
                   )}
                 </>
               ) : (
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