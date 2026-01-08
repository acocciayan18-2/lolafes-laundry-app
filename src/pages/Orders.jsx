import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { IconPlus, IconSearch, IconShirt } from "../components/icons";
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
  <button className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none ${className}`} {...props}>
    {children}
  </button>
);

const Input = ({ className, ...props }) => (
  <input
    className={`
      flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm
      placeholder:text-gray-400 outline-none transition-all
      focus:!border-black focus:!ring-0
      ${className}
    `}
    {...props}
  />
);

const LaundryLoader = () => (
  <div className="flex flex-col items-center justify-center space-y-2">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    <p className="text-xs text-gray-400">Loading orders...</p>
  </div>
);

export default function Orders() {
  const { orders, isLoading, subscribeToOrders, updateOrderStatus } = useOrderStore();
  
  // 2. INITIALIZE THE LOGGER
  const logActivity = useActivityStore((state) => state.logActivity);
  
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe(); 
  }, [subscribeToOrders]);

  // 3. CREATE THE INTERCEPTOR HANDLER
  // This ensures that whenever a status changes, a new card is created in the history
  const handleStatusUpdate = useCallback(async (orderId, newStatus) => {
    try {
      // Find the current order data before/during update to get details (name, amount, etc.)
      const orderToLog = orders.find(o => o.id === orderId);
      
      // Update the actual Order state/database
      await updateOrderStatus(orderId, newStatus);
      
      // Create a NEW dedicated card in the activity feed
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 pt-2 md:p-4">
      <motion.div layoutRoot className="max-w-5xl mx-auto px-1 md:px-2">
        <LayoutGroup>
          {/* Header & Filters (remain the same) */}
          <motion.div layout className="flex flex-row justify-between items-center mt-2 mb-3 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
              <p className="text-gray-600 mt-1 text-[14px]">Manage and track orders</p>
            </div>
            <Link to="/main/neworder">
              <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md text-white px-4 py-2 h-9 rounded-lg flex items-center gap-2">
                <IconPlus className="w-4 h-4 !text-white !stroke-white" />
                <span className="text-sm font-medium text-white">New Order</span>
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
          <motion.div layout className="grid gap-1 grid-cols-1 overflow-visible">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <motion.div key="loader" className="col-span-full py-20 flex justify-center"><LaundryLoader /></motion.div>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ ...SPRING_TRANSITION, delay: index * 0.03 }}
                  >
                    <OrderCard
                      order={order}
                      // 4. USE THE NEW HANDLER HERE
                      onStatusUpdate={handleStatusUpdate}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div className="text-center py-16 bg-white/40 border border-dashed border-slate-300 rounded-2xl">
                   {/* Empty State UI */}
                   <IconShirt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                   <h3 className="text-lg font-bold text-slate-600">No orders found</h3>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}