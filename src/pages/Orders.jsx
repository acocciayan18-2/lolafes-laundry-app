import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { IconSearch, IconShirt, IconAddNewOrder } from "../components/icons";
import OrderFilters from "../components/orders/OrderFilters";
import OrderCard from "../components/orders/OrderCard";
import { useOrderStore } from "../store/orders/useOrderStore"; 
import { useActivityStore } from "../store/activities/useActivityStore";

const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
  restDelta: 0.01
};

const Button = ({ children, className = "", ...props }) => (
  <button className={`inline-flex items-center justify-center rounded-lg font-bold transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none ${className}`} {...props}>
    {children}
  </button>
);

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

const LaundryLoader = () => (
  <div className="flex flex-col items-center justify-center space-y-2">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    {/* Applied text-micro for meta-loading state */}
    <p className="text-micro font-bold uppercase  text-gray-400">Loading orders...</p>
  </div>
);

export default function Orders() {
  const { orders, isLoading, subscribeToOrders, updateOrderStatus } = useOrderStore();
  const logActivity = useActivityStore((state) => state.logActivity);
  
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");

  useEffect(() => {
    const handleGlobalSearchFocus = (e) => {
      const activeElement = document.activeElement;
      const isAlreadyTyping = 
        activeElement.tagName === "INPUT" || 
        activeElement.tagName === "TEXTAREA" || 
        activeElement.isContentEditable;

      if (isAlreadyTyping) return;

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const searchInput = document.querySelector('input[placeholder*="Search name"]');
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


  useEffect(() => {
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe(); 
  }, [subscribeToOrders]);

  const handleStatusUpdate = useCallback(async (orderId, newStatus) => {
    try {
      const orderToLog = orders.find(o => o.id === orderId);
      await updateOrderStatus(orderId, newStatus);
      if (orderToLog) {
        logActivity(orderToLog, newStatus);
      }
    } catch (error) {
      console.error("Failed to update status and log activity:", error);
    }
  }, [orders, updateOrderStatus, logActivity]);

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
        (order.customer_phone?.includes(lowerTerm)) ||
        (order.customer_address?.toLowerCase().includes(lowerTerm)) ||
        (order.order_number?.toLowerCase().includes(lowerTerm))
      );
    }
    
    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, dateFilter]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  return (
    <div className="min-h-screen bg-app-light p-2 ">
      <motion.div layoutRoot className="max-w-6xl mx-auto px-1 md:px-2">
        <LayoutGroup>
          
          <motion.div layout className="flex flex-row items-center mb-3 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {/* Main Page Title: text-h1 */}
                <h1 className="text-h2 text-text-dark">All Orders</h1>
                
                {/* ORDER COUNT BADGE: text-micro for meta clarity */}
                {!isLoading && (
                  <span className="flex items-center justify-center bg-app-dark/5 px-2 py-0.5 rounded-lg text-micro font-bold text-text-dark/70 uppercase tracking-tighter min-w-[24px]">
                    {filteredOrders.length}
                  </span>
                )}
              </div>
              {/* Description: text-sm-text */}
              <p className="text-sm-text text-gray-600 mt-0.5">Manage and track orders</p>
            </div>
            
            <Link to="/main/neworder">
              <button className="group flex items-center justify-center w-9 h-9 shadow-md bg-white hover:bg-app-dark/5 active:bg-app-dark/5 rounded-xl border border-text-dark/20 active:scale-95 transition-all duration-200">
                <IconAddNewOrder className="w-5 h-5" />
              </button>
            </Link>
          </motion.div>

          <motion.div layout className="flex flex-col lg:flex-row gap-2 mb-3">
            <div className="relative w-full lg:flex-1">
              <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <Input
                placeholder="Search name, phone, address, or order #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="!pl-10 bg-white/80 border-slate-200"
              />
            </div>
            <OrderFilters 
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              dateFilter={dateFilter} setDateFilter={setDateFilter}
            />
          </motion.div>

          {/* Orders List */}
          {/* Orders List Container */}
<motion.div 
  layout 
  className="flex flex-col overflow-visible" // Removed min-h-[400px] and gap-1
>
  <AnimatePresence mode="popLayout">
    {isLoading ? (
      <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-20 flex justify-center">
        <LaundryLoader />
      </motion.div>
    ) : filteredOrders.length > 0 ? (
      filteredOrders.map((order, index) => (
        <motion.div
          key={order.id}
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ ...SPRING_TRANSITION, delay: index * 0.02 }}
        >
          {/* Note: OrderCard already has mb-3, so we don't need container gap */}
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
        className="flex flex-col items-center text-center py-20" // Increased padding for empty state only
      >
        <div className="w-20 h-20 flex items-center justify-center">
          <IconShirt className="w-10 h-10 text-text-dark/10" />
        </div>
        <h3 className="text-h3 font-bold text-text-dark/70">No orders found</h3>
        <p className="text-sm-text font-medium text-text-dark/50 mt-1">Try adjusting your filters or search term</p>
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}