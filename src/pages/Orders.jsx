import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

// Store & Tour Imports
import { useOrderStore } from "../store/orders/useOrderStore";
import { useOrderFilterStore } from "../store/orders/useOrderFilterStore";
import { useActivityStore } from "../store/activities/useActivityStore";
import { startGlobalTour } from '../tours/globalTours';

// Component Imports
import OrderCard from "../components/orders/OrderCard";
import OrderFilters from "../components/orders/OrderFilters";
import { IconAddNewOrder, IconShirt, IconSearch } from "../components/icons";
import { OrderListSkeleton } from "../components/skeleton-loader";

const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01
};

export default function Orders() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. TOUR DETECTION (Defined at the top to prevent ReferenceErrors)
  const searchParams = new URLSearchParams(location.search);
  const isTourActive = searchParams.get('tour') === 'active';

  // 2. STORE DATA
  const { orders, isLoading, subscribeToOrders, updateOrderStatus } = useOrderStore();
  const logActivity = useActivityStore((state) => state.logActivity);
  const { 
    searchTerm, setSearchTerm, 
    statusFilter, setStatusFilter, 
    dateFilter, setDateFilter 
  } = useOrderFilterStore();

  // 3. LOCAL STATE
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  // Determine if we need the Dummy Card for the Tour
  const showDummyCard = isTourActive && (isLoading || filteredOrders.length === 0);

  // --- EFFECTS ---

  // Firebase Subscription
  useEffect(() => {
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe(); 
  }, [subscribeToOrders]);

  // Tour Trigger Logic
  useEffect(() => {
    if (isTourActive && !isLoading) {
      const timer = setTimeout(() => {
        startGlobalTour(navigate);
      }, 1200); 
      return () => clearTimeout(timer);
    }
  }, [isTourActive, isLoading, navigate]);

  // Skeleton Delay Logic
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 400);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // --- FILTER LOGIC ---
  const filterOrders = useCallback(() => {
    let filtered = [...orders];

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

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

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        (order.customer_name?.toLowerCase().includes(lowerTerm)) ||
        (order.order_number?.toLowerCase().includes(lowerTerm))
      );
    }

    // Logic to keep the list clean (Active vs Picked Up)
    const active = filtered.filter(o => o.status !== 'picked_up');
    const pickedUp = filtered.filter(o => o.status === 'picked_up');
    const limitedPickedUp = pickedUp.slice(0, Math.max(0, 30 - active.length));

    setFilteredOrders([...active, ...limitedPickedUp]);
  }, [orders, searchTerm, statusFilter, dateFilter]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const handleStatusUpdate = useCallback(async (orderId, newStatus) => {
    try {
      const orderToLog = orders.find(o => o.id === orderId);
      await updateOrderStatus(orderId, newStatus);
      if (orderToLog) logActivity(orderToLog, newStatus);
    } catch (error) {
      console.error("Status update failed:", error);
    }
  }, [orders, updateOrderStatus, logActivity]);

  // --- RENDERING ---
  if (isLoading && shouldShowSkeleton && !isTourActive) return <OrderListSkeleton />;

  return (
    <div className="min-h-screen bg-app-light p-2">
      <motion.div layoutRoot className="max-w-6xl mx-auto px-1 md:px-2">
        <LayoutGroup>
          
          {/* Header */}
          <motion.div layout className="flex flex-row items-center mb-3 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-h2 text-text-dark">All Orders</h1>
                {!isLoading && (
                  <span className="bg-app-dark/5 px-2 py-0.5 rounded-lg text-micro font-bold text-text-dark/70 uppercase">
                    {filteredOrders.length}
                  </span>
                )}
              </div>
              <p className="text-sm-text text-gray-600 mt-0.5">Manage and track orders</p>
            </div>
            
            <Link to="/main/neworder">
              <button className="group flex items-center justify-center w-9 h-9 shadow-md bg-white rounded-xl border border-text-dark/20 active:scale-95 transition-all">
                <IconAddNewOrder className="w-5 h-5" />
              </button>
            </Link>
          </motion.div>

          {/* Filters Bar */}
          <motion.div layout className="mb-3">
            <OrderFilters 
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              dateFilter={dateFilter} setDateFilter={setDateFilter}
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            />
          </motion.div>

          {/* Orders List */}
          <motion.div layout className="flex flex-col overflow-visible">
            <AnimatePresence mode="popLayout">
               {/* 1. REAL ORDERS */}
               {filteredOrders.length > 0 ? (
                 filteredOrders.map((order, index) => (
                   <motion.div
                     key={order.id}
                     layout
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.98 }}
                     transition={{ ...SPRING_TRANSITION, delay: index * 0.02 }}
                     // ID for Tour Targeting (First real card)
                     id={index === 0 ? "step-order-card-0" : undefined}
                   >
                     <OrderCard order={order} onStatusUpdate={handleStatusUpdate} />
                   </motion.div>
                 ))
               ) : !showDummyCard && (
                 <motion.div key="empty" className="text-center py-20">
                   <IconShirt className="w-10 h-10 text-text-dark/10 mx-auto mb-2" />
                   <h3 className="text-h3 font-medium text-text-dark/70">No orders found</h3>
                 </motion.div>
               )}

               {/* 2. TOUR DUMMY CARD (Force Reveal) */}
               {showDummyCard && (
                 <motion.div
                   key="tour-dummy"
                   id="step-order-card-0"
                   layout
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="w-full bg-white p-4 rounded-xl border-2 border-dashed border-blue-400/50 shadow-sm flex items-center justify-between mb-3"
                 >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <IconShirt className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="h-4 w-32 bg-blue-100/50 rounded mb-2 animate-pulse" />
                        <div className="h-3 w-24 bg-blue-50 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 text-micro font-bold rounded-full uppercase">
                      Example Order
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}