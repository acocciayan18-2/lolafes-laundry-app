import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { useOrderStore } from '../store/orders/useOrderStore';

// 2. Component Imports
import CompactIntelligence from '../components/dashboard/CompactIntelligence';
import QuickActions from '../components/dashboard/QuickActions';
import QuickStats from '../components/dashboard/QuickStats';
import RecentActivity from '../components/dashboard/RecentActivity';
import TodayOrders from '../components/dashboard/TodayOrders';
import { IconCheckCircle, IconClock, IconPackage, IconTrendingUp } from '../components/icons';

// --- ANIMATION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export default function Dashboard() {

  const { orders, isLoading, subscribeToOrders } = useOrderStore();

  useEffect(() => {
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe && unsubscribe();
  }, [subscribeToOrders]);

  const [currentTime, setCurrentTime] = useState(new Date());

useEffect(() => {
  const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  return () => clearInterval(timer);
}, []);


  // --- CALCULATIONS ---
  const now = new Date();
  const todayOrders = orders.filter(order => isSameDay(new Date(order.created_date), now));
  
  const todayRevenue = todayOrders
    .filter(order => order.is_paid)
    .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const inProgress = orders.filter(o => o.status === 'in_progress').length;
  const readyOrders = orders.filter(o => o.status === 'ready').length;

  
const hours = currentTime.getHours();
const greeting = hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-app-light text-slate-900 p-2  transition-colors duration-500">
      
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        <AnimatePresence mode="wait">
          {!isLoading ? (
            <motion.div 
              key="dashboard-content"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {/* --- 1. HEADER & ACTIONS --- */}
              {/* Logic to determine greeting based on currentTime */}

<motion.div variants={itemVariants} className="flex flex-row justify-between gap-6">
  <div>
    <div className="flex items-center gap-3">
      {/* Replaced "Dashboard" with the dynamic greeting */}
      <h1 className="text-2xl font-bold text-text-dark capitalize">
        {greeting}
      </h1>
    </div>
    <div>
      <div className="flex items-center justify-between text-white py-0.5 gap-2">
        <p className="text-text-dark text-[12px] font-medium ">
          {currentTime.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </p>
        <span className='opacity-60 text-text-dark text-[13px]'> | </span>
        <span className="text-text-dark text-[12px] font-medium">
          {currentTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          }).toUpperCase()}
        </span>
      </div>
    </div>
  </div>
  <div id="step-actions">
    <QuickActions />
  </div>
</motion.div>

              {/* --- 2. INTELLIGENCE TICKER --- */}
              <motion.div 
                variants={itemVariants} 
                id="step-intelligence" 
              >
                <CompactIntelligence />
              </motion.div>

              {/* --- 3. QUICK STATS --- */}
              <motion.div variants={itemVariants} id="step-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickStats title="Today's Sales" value={`₱${todayRevenue.toLocaleString()}`} icon={<IconTrendingUp />} bgColor="from-emerald-400 to-green-500 shadow-emerald-200" trend={`${todayOrders.length} orders`} />
                <QuickStats title="Pending" value={pendingOrders} icon={<IconClock />} bgColor="from-amber-400 to-orange-500 shadow-orange-200" trend="Needs attention" />
                <QuickStats title="In Progress" value={inProgress} icon={<IconPackage />} bgColor="from-blue-400 to-indigo-500 shadow-blue-200" trend="Being washed"/>
                <QuickStats title="Ready" value={readyOrders} icon={<IconCheckCircle />} bgColor="from-purple-400 to-pink-500 shadow-purple-200" trend="Notify users"/>
              </motion.div>

              {/* --- 4. DATA GRIDS --- */}
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
  {/* Left Column: Changed from col-span-7 to col-span-6 */}
  <motion.div variants={itemVariants} id="step-today-orders" className="lg:col-span-6">
    <TodayOrders orders={todayOrders} isLoading={isLoading} />
  </motion.div>

  {/* Right Column: Changed from col-span-5 to col-span-6 */}
  <motion.div variants={itemVariants} id="step-activity" className="lg:col-span-6">
    <RecentActivity />
  </motion.div>
</div>
            </motion.div>
          ) : (
            <motion.div 
              key="loading" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex h-[80vh] items-center justify-center"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}