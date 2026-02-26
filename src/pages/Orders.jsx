import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
<<<<<<< HEAD
import { Link, useLocation, useNavigate } from "react-router-dom";
import { IconAddNewOrder, IconSearch, IconShirt } from "../components/icons";
import OrderCard from "../components/orders/OrderCard";
import OrderFilters from "../components/orders/OrderFilters";
import { useActivityStore } from "../store/activities/useActivityStore";
import { useOrderStore } from "../store/orders/useOrderStore";
import { OrderListSkeleton } from "../components/skeleton-loader";

// TOUR
import { startGlobalTour } from '../tours/globalTours';
=======
import { Link } from "react-router-dom";
import { IconAddNewOrder, IconShirt } from "../components/icons";
import OrderCard from "../components/orders/OrderCard";
import OrderFilters from "../components/orders/OrderFilters";
import { OrderListSkeleton } from "../components/skeleton-loader";
import { useActivityStore } from "../store/activities/useActivityStore";
import { useOrderFilterStore } from "../store/orders/useOrderFilterStore";
import { useOrderStore } from "../store/orders/useOrderStore";
>>>>>>> Karen2.0

const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01
};

<<<<<<< HEAD
const Input = ({ className, ...props }) => (
  <input
    className={`
      flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 
      text-sm-text text-text-dark placeholder:text-gray-400 outline-none transition-all
      focus:!border-app-dark/70 focus:!ring-0
      ${className}
    `}
    {...props}
  />
);

export default function Orders() {
  const location = useLocation();
  const navigate = useNavigate();

  // STORE DATA
  const { orders, isLoading, subscribeToOrders, updateOrderStatus } = useOrderStore();
  const logActivity = useActivityStore((state) => state.logActivity);

  // LOCAL STATE
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  // TOUR DETECTION
  const isTourActive = new URLSearchParams(location.search).get('tour') === 'active';
  const showDummyCard = isTourActive && (isLoading || filteredOrders.length === 0);

  // 1. TOUR RECEIVER
  useEffect(() => {
    if (isTourActive && !isLoading) {
      const timer = setTimeout(() => {
        startGlobalTour(navigate);
      }, 1200); 
      return () => clearTimeout(timer);
    }
  }, [location.search, isLoading, navigate, isTourActive]);

  // 2. FIREBASE SUBSCRIPTION
=======


export default function Orders() {
  const { orders, isLoading, subscribeToOrders, updateOrderStatus } = useOrderStore();
  const logActivity = useActivityStore((state) => state.logActivity);
  
  const { 
    searchTerm, setSearchTerm, 
    statusFilter, setStatusFilter, 
    dateFilter, setDateFilter 
  } = useOrderFilterStore();

  const [filteredOrders, setFilteredOrders] = useState([]);
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);


  // 1. Firebase Subscription
>>>>>>> Karen2.0
  useEffect(() => {
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe(); 
  }, [subscribeToOrders]);

<<<<<<< HEAD
  // 3. SKELETON DELAY
=======
  // 2. Skeleton Delay Logic
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
    return () => clearTimeout(timer);
  }, [isLoading]);

<<<<<<< HEAD
  // 4. GLOBAL SEARCH HANDLER
  useEffect(() => {
    const handleGlobalSearchFocus = (e) => {
      const activeElement = document.activeElement;
      if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") return;
=======
  // 3. Global Search Handler
  useEffect(() => {
    const handleGlobalSearchFocus = (e) => {
      const activeElement = document.activeElement;
      const isAlreadyTyping = 
        activeElement.tagName === "INPUT" || 
        activeElement.tagName === "TEXTAREA" || 
        activeElement.isContentEditable;

      if (isAlreadyTyping) return;
>>>>>>> Karen2.0

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const searchInput = document.querySelector('input[placeholder*="Search name"]');
        if (searchInput) {
          searchInput.focus();
          setSearchTerm(prev => prev + e.key);
          e.preventDefault();
        }
      }
    };
<<<<<<< HEAD
    window.addEventListener("keydown", handleGlobalSearchFocus);
    return () => window.removeEventListener("keydown", handleGlobalSearchFocus);
  }, []);
=======

    window.addEventListener("keydown", handleGlobalSearchFocus);
    return () => window.removeEventListener("keydown", handleGlobalSearchFocus);
  }, [setSearchTerm]);
>>>>>>> Karen2.0

  const handleStatusUpdate = useCallback(async (orderId, newStatus) => {
    try {
      const orderToLog = orders.find(o => o.id === orderId);
      await updateOrderStatus(orderId, newStatus);
<<<<<<< HEAD
      if (orderToLog) logActivity(orderToLog, newStatus);
    } catch (error) {
      console.error("Update failed:", error);
    }
  }, [orders, updateOrderStatus, logActivity]);

  const filterOrders = useCallback(() => {
    let filtered = [...orders];
    if (statusFilter !== "all") filtered = filtered.filter(o => o.status === statusFilter);
    
    if (dateFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_date);
        return orderDate >= today; // Simplified for this example
      });
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.customer_name?.toLowerCase().includes(lowerTerm) ||
        o.order_number?.toLowerCase().includes(lowerTerm)
      );
    }
    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, dateFilter]);

  useEffect(() => { filterOrders(); }, [filterOrders]);

  if (isLoading && shouldShowSkeleton && !isTourActive) return <OrderListSkeleton />;
=======
      if (orderToLog) {
        logActivity(orderToLog, newStatus);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }, [orders, updateOrderStatus, logActivity]);

  // --- FILTER & LIMIT LOGIC ---
  const filterOrders = useCallback(() => {
    let filtered = [...orders];

    // Status Filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Date Filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_date);
        switch (dateFilter) {
          case "today": return orderDate >= today;
          case "yesterday":
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return orderDate >= yesterday && orderDate < today;
          case "last_7":
            const last7 = new Date(today);
            last7.setDate(last7.getDate() - 7);
            return orderDate >= last7;
          case "last_30":
            const last30 = new Date(today);
            last30.setDate(last30.getDate() - 30);
            return orderDate >= last30;
          default: return true;
        }
      });
    }

    // Search Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        (order.customer_name?.toLowerCase().includes(lowerTerm)) ||
        (order.customer_phone?.includes(lowerTerm)) ||
        (order.customer_address?.toLowerCase().includes(lowerTerm)) ||
        (order.order_number?.toLowerCase().includes(lowerTerm))
      );
    }

   
    const active = filtered.filter(o => o.status !== 'picked_up');
    const pickedUp = filtered.filter(o => o.status === 'picked_up');

    // Always show all active orders. Only fill the rest of the 30 slots with Picked Up.
    const remainingSlots = Math.max(0, 30 - active.length);
    const limitedPickedUp = pickedUp.slice(0, remainingSlots);

    setFilteredOrders([...active, ...limitedPickedUp]);
  }, [orders, searchTerm, statusFilter, dateFilter]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  if (isLoading && shouldShowSkeleton) return <OrderListSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;
>>>>>>> Karen2.0

  return (
    <div className="min-h-screen bg-app-light p-2">
      <motion.div layoutRoot className="max-w-6xl mx-auto px-1 md:px-2">
        <LayoutGroup>
          
<<<<<<< HEAD
          {/* Header */}
=======
          {/* Header Section */}
>>>>>>> Karen2.0
          <motion.div layout className="flex flex-row items-center mb-3 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-h2 text-text-dark">All Orders</h1>
<<<<<<< HEAD
                <span className="bg-app-dark/5 px-2 py-0.5 rounded-lg text-micro font-bold text-text-dark/70">
                  {filteredOrders.length}
                </span>
              </div>
              <p className="text-sm-text text-gray-600 mt-0.5">Manage and track orders</p>
            </div>
            <Link to="/main/neworder">
              <button className="group flex items-center justify-center w-9 h-9 bg-white rounded-xl border border-text-dark/20 shadow-sm active:scale-95">
=======
                {!isLoading && (
                  <span className="flex items-center justify-center bg-app-dark/5 px-2 py-0.5 rounded-lg text-micro font-bold text-text-dark/70 uppercase tracking-tighter min-w-[24px]">
                    {filteredOrders.length}
                  </span>
                )}
              </div>
              <p className="text-sm-text text-gray-600 mt-0.5">Manage and track orders</p>
            </div>
            
            <Link to="/main/neworder">
              <button className="group flex items-center justify-center w-9 h-9 shadow-md bg-white hover:bg-app-dark/5 active:bg-app-dark/5 rounded-xl border border-text-dark/20 active:scale-95 transition-all duration-200">
>>>>>>> Karen2.0
                <IconAddNewOrder className="w-5 h-5" />
              </button>
            </Link>
          </motion.div>

<<<<<<< HEAD
          {/* Search & Filters */}
          <motion.div layout className="flex flex-col lg:flex-row gap-2 mb-3">
            <div id="step-search" className="relative w-full lg:flex-1">
              <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <Input
                placeholder="Search name, phone, address, or order #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="!pl-10 bg-white/80 border-slate-200"
              />
            </div>
            <div id="step-filters">
              <OrderFilters 
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                dateFilter={dateFilter} setDateFilter={setDateFilter}
              />
            </div>
=======
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
>>>>>>> Karen2.0
          </motion.div>

          {/* Orders List */}
          <motion.div layout className="flex flex-col overflow-visible">
            <AnimatePresence mode="popLayout">
<<<<<<< HEAD
               
               {/* 1. REAL ORDERS */}
               {filteredOrders.length > 0 && filteredOrders.map((order, index) => (
                 <motion.div
                   key={order.id}
                   layout
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.98 }}
                   transition={{ ...SPRING_TRANSITION, delay: index * 0.02 }}
                   id={index === 0 ? "step-order-card-0" : undefined}
                 >
                   <OrderCard order={order} onStatusUpdate={handleStatusUpdate} />
                 </motion.div>
               ))}

               {/* 2. FORCE REVEAL DUMMY (Tour Only) */}
               {showDummyCard && (
                 <motion.div
                   key="tour-dummy"
                   id="step-order-card-0"
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="w-full bg-white p-4 rounded-xl border-2 border-dashed border-app-dark/20 shadow-sm flex items-center justify-between"
                 >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-app-dark/5 flex items-center justify-center">
                        <IconShirt className="w-5 h-5 text-app-dark/20" />
                      </div>
                      <div>
                        <div className="h-4 w-32 bg-gray-100 rounded mb-2 animate-pulse" />
                        <div className="h-3 w-20 bg-gray-50 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-app-dark/5 text-micro font-bold text-app-dark/30 uppercase">
                      Tour Example
                    </div>
                 </motion.div>
               )}

               {/* 3. EMPTY STATE (Non-Tour) */}
               {!showDummyCard && filteredOrders.length === 0 && !isLoading && (
                 <motion.div 
                   key="empty-state"
                   className="flex flex-col items-center text-center py-20"
                 >
                    <IconShirt className="w-10 h-10 text-text-dark/10 mb-2" />
                    <h3 className="text-h3 font-medium text-text-dark/70">No orders found</h3>
                    <p className="text-sm-text text-text-dark/40">Try adjusting your filters</p>
                 </motion.div>
               )}

=======
               {filteredOrders.length > 0 ? (
                 filteredOrders.map((order, index) => (
                   <motion.div
                     key={order.id}
                     layout
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.98 }}
                     transition={{ ...SPRING_TRANSITION, delay: index * 0.02 }}
                   >
                     <OrderCard order={order} onStatusUpdate={handleStatusUpdate} />
                   </motion.div>
                 ))
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
>>>>>>> Karen2.0
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}