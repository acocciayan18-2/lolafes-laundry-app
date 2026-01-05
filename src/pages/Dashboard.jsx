import React, { useState, useEffect } from 'react';
// 1. Added AnimatePresence
import { motion, AnimatePresence } from 'framer-motion';
import { IconTrendingUp, IconClock, IconPackage, IconCheckCircle } from '../components/icons';
import QuickActions from '../components/dashboard/QuickActions';
import QuickStats from '../components/dashboard/QuickStats';
import TodayOrders from '../components/dashboard/TodayOrders';
import RecentCustomers from '../components/dashboard/RecentCustomers';
import PopularServices from '../components/dashboard/PopularServices';
import RecentActivity from '../components/dashboard/RecentActivity';
import ComparisonCards from '../components/dashboard/ComparisonCards';

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 }
  }
};

// --- HELPER FUNCTIONS ---
const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  }).format(date);
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
};

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMockData = async () => {
      setIsLoading(true);
      // Simulating API fetch
      await new Promise(resolve => setTimeout(resolve, 800));
      const now = new Date();
      
      const MOCK_ORDERS = [
        { id: "1001-ORDER-A", customer_name: "Maria Santos", status: "pending", total_amount: 150.00, created_date: now.toISOString(), is_paid: true, services: [{ service_name: "Wash & Dry", weight_kg: 5, total_price: 150 }] },
        { id: "1002-ORDER-B", customer_name: "Juan Dela Cruz", status: "in_progress", total_amount: 450.00, created_date: now.toISOString(), is_paid: true, services: [{ service_name: "Dry Clean", weight_kg: 2, total_price: 450 }] },
        { id: "1003-ORDER-C", customer_name: "Lola Fe", status: "ready", total_amount: 300.00, created_date: now.toISOString(), is_paid: true, services: [{ service_name: "Wash & Dry", weight_kg: 8, total_price: 300 }] }
      ];

      const MOCK_CUSTOMERS = [
        { id: 1, name: "Maria Santos", phone: "0917-123-4567", created_date: now.toISOString(), total_orders: 12 },
        { id: 2, name: "Juan Dela Cruz", phone: "0918-999-8888", created_date: now.toISOString(), total_orders: 5 },
        { id: 3, name: "Lola Fe", phone: "0920-555-4433", created_date: now.toISOString(), total_orders: 28 },
      ];

      setOrders(MOCK_ORDERS);
      setCustomers(MOCK_CUSTOMERS);
      // FINAL STEP: Stop loading only after state is set
      setIsLoading(false);
    };
    loadMockData();
  }, []);

  const now = new Date();
  const todayOrders = orders.filter(order => isSameDay(new Date(order.created_date), now));
  const todayRevenue = todayOrders.filter(order => order.is_paid).reduce((sum, order) => sum + order.total_amount, 0);

  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const readyOrders = orders.filter(order => order.status === 'ready').length;
  const inProgressOrders = orders.filter(order => order.status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8">
      <AnimatePresence mode="wait">
        {!isLoading ? (
          <motion.div 
            key="dashboard-content"
            className="max-w-7xl mx-auto space-y-6"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={containerVariants}
          >
            {/* HEADER SECTION */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Good {getGreeting()}!</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-blue-600 font-bold rounded-lg text-xs ">{formatDate(now)}</span>
                </div>
              </div>
              <QuickActions />
            </motion.div>

            {/* QUICK STATS */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
              <QuickStats title="Today's Revenue" value={`₱${todayRevenue.toLocaleString()}`} icon={<IconTrendingUp />} bgColor="from-emerald-400 to-green-500" trend={`${todayOrders.length} orders`} />
              <QuickStats title="Pending" value={pendingOrders} icon={<IconClock />} bgColor="from-amber-400 to-orange-500" trend="Needs attention" />
              <QuickStats title="In Progress" value={inProgressOrders} icon={<IconPackage />} bgColor="from-blue-400 to-indigo-500" trend="Being washed" />
              <QuickStats title="Ready" value={readyOrders} icon={<IconCheckCircle />} bgColor="from-purple-400 to-pink-500" trend="Notify users" />
            </motion.div>

            {/* COMPARISON CARDS */}
            <motion.div variants={itemVariants}>
              <ComparisonCards orders={orders} />
            </motion.div>

            {/* TODAY'S ORDERS */}
            <motion.div variants={itemVariants} className="w-full">
               <TodayOrders orders={todayOrders} isLoading={isLoading} />
            </motion.div>

            {/* INSIGHTS GRID */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              <RecentActivity orders={orders} />
              <PopularServices orders={orders} />
              <RecentCustomers customers={customers} orders={orders} />
            </motion.div>
          </motion.div>
        ) : (
          /* OPTIONAL: You can put a Loader here so the screen isn't just blank */
          <motion.div 
            key="loader"
            className="flex h-[70vh] items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}