import { AnimatePresence, motion } from 'framer-motion';
<<<<<<< HEAD
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Store & Tour Imports
import { useOrderStore } from '../store/orders/useOrderStore';
import { startGlobalTour } from '../tours/globalTours';
=======
import { useEffect, useState, useRef } from 'react'; // 1. Added useRef
import { useOrderStore } from '../store/orders/useOrderStore';
import { useUnclaimedStore } from '../store/orders/useUnclaimedStore'; // 2. Added store import
>>>>>>> Karen2.0

// Component Imports
import CompactIntelligence from '../components/dashboard/CompactIntelligence';
import QuickActions from '../components/dashboard/QuickActions';
import QuickStats from '../components/dashboard/QuickStats';
import RecentActivity from '../components/dashboard/RecentActivity';
import TodayOrders from '../components/dashboard/TodayOrders';
<<<<<<< HEAD
import { IconCheckCircle, IconClock, IconPackage, IconTrendingUp } from '../components/icons';
import { DashboardSkeleton } from '../components/skeleton-loader';

// --- ANIMATION VARIANTS ---
=======
import UnclaimedOrders from'../components/dashboard/UnclaimedOrders';
import { IconAlertTriangle, IconCheckCircle, IconClock, IconPackage, IconTrendingUp } from '../components/icons';
import { DashboardSkeleton } from '../components/skeleton-loader';

>>>>>>> Karen2.0
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

<<<<<<< HEAD
export default function Dashboard() {
  // 1. ROUTING HOOKS
  const location = useLocation();
  const navigate = useNavigate();

  // 2. STORE DATA (Initialized before the useEffect to avoid ReferenceErrors)
  const { orders, isLoading, subscribeToOrders } = useOrderStore();
  
  // 3. LOCAL STATE
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  //Tour Logic 

 useEffect(() => {
  const searchParams = new URLSearchParams(location.search);
  const isTourActive = searchParams.get('tour') === 'active';
  
  // Also check if the store is still loading
  if (isTourActive && !isLoading) {
    // INCREASE the timeout. 400ms is often too fast for 
    // Framer Motion + Firebase data fetching.
    const timer = setTimeout(() => {
      console.log("Tour Triggered!"); // Check your console to see if this fires
      startGlobalTour(navigate);
    }, 1200); 

    return () => clearTimeout(timer);
  }
}, [location.search, isLoading]); // Added isLoading as a dependency

  // 5. FIREBASE SUBSCRIPTION
=======

export default function Dashboard() {
  const { orders, isLoading, subscribeToOrders } = useOrderStore();
  const { unclaimedOrders } = useUnclaimedStore(); // 3. Get unclaimed orders
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);
  
  // 4. Create the Ref for scrolling
  const unclaimedRef = useRef(null);

>>>>>>> Karen2.0
  useEffect(() => {
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe && unsubscribe();
  }, [subscribeToOrders]);

<<<<<<< HEAD
  // 6. CLOCK TIMER
=======
>>>>>>> Karen2.0
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

<<<<<<< HEAD
  // 7. SKELETON DELAY LOGIC (400ms)
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 400);
=======
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        setShouldShowSkeleton(true);
      }, 400);
>>>>>>> Karen2.0
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

<<<<<<< HEAD
  // --- CALCULATIONS ---
  const now = new Date();
  const todayOrders = orders.filter(order => isSameDay(new Date(order.created_date), now));
  
=======
  // 5. Scroll Function
  const scrollToUnclaimed = () => {
    unclaimedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // --- CALCULATIONS ---
  const now = new Date();
  const todayOrders = orders.filter(order => isSameDay(new Date(order.created_date), now));
>>>>>>> Karen2.0
  const todayRevenue = todayOrders
    .filter(order => order.is_paid)
    .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const inProgress = orders.filter(o => o.status === 'in_progress').length;
  const readyOrders = orders.filter(o => o.status === 'ready').length;

  const hours = currentTime.getHours();
  const greeting = hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening";

<<<<<<< HEAD
  // --- RENDERING LOGIC ---

  if (isLoading && shouldShowSkeleton) {
    return <DashboardSkeleton />;
  }

  if (isLoading && !shouldShowSkeleton) {
    return null; 
  }
=======
  if (isLoading && shouldShowSkeleton) return <DashboardSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;
>>>>>>> Karen2.0

  return (
    <div className="min-h-screen bg-app-light text-slate-900 p-2 transition-colors duration-500">
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        <AnimatePresence mode="wait">
          <motion.div 
            key="dashboard-content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {/* --- 1. HEADER & ACTIONS --- */}
<<<<<<< HEAD
            <motion.div variants={itemVariants} className="flex flex-row justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold text-text-dark capitalize">
                  {greeting}
                </h1>
                <div className="flex items-center text-white py-0.5 gap-2">
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
=======
            <motion.div variants={itemVariants} className="flex flex-row justify-between gap-6 items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-text-dark capitalize">
                    {greeting}
                  </h1>
                </div>
                <div>
                  <div className="flex items-center justify-between text-white py-0.5 gap-2">
                    <p className="text-text-dark text-[12px] font-medium ">
                      {currentTime.toLocaleDateString('en-US', { 
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </p>
                    <span className='opacity-60 text-text-dark text-[13px]'> | </span>
                    <span className="text-text-dark text-[12px] font-medium">
                      {currentTime.toLocaleTimeString([], { 
                        hour: '2-digit', minute: '2-digit', hour12: true 
                      }).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

>>>>>>> Karen2.0
              <div id="step-actions">
                <QuickActions />
              </div>
            </motion.div>

            {/* --- 2. INTELLIGENCE TICKER --- */}
<<<<<<< HEAD
            <motion.div variants={itemVariants} id="step-intelligence">
              <CompactIntelligence />
            </motion.div>

            {/* --- 3. QUICK STATS --- */}
            <motion.div variants={itemVariants} id="step-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickStats title="Today's Sales" value={`₱${todayRevenue.toLocaleString()}`} icon={<IconTrendingUp />} trend={`${todayOrders.length} orders`} />
              <QuickStats title="Pending" value={pendingOrders} icon={<IconClock />} trend="Needs attention" />
              <QuickStats title="In Progress" value={inProgress} icon={<IconPackage />} trend="Being washed"/>
              <QuickStats title="Ready" value={readyOrders} icon={<IconCheckCircle />} trend="Notify users"/>
            </motion.div>

            {/* --- 4. DATA GRIDS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <motion.div variants={itemVariants} id="step-today-orders" className="lg:col-span-6">
                <TodayOrders orders={todayOrders} isLoading={isLoading} />
              </motion.div>
=======
           {/* --- 2. INTELLIGENCE & ALERTS ROW --- */}
<motion.div variants={itemVariants} id="step-intelligence" className="flex flex-col md:flex-row items-center justify-between gap-4">
  
  {/* Left Side: Intelligence Ticker */}
  <div className="flex-1 w-full">
    <CompactIntelligence />
  </div>

  {/* Right Side: Unclaimed Alert Link (Pinned to the end) */}
  {unclaimedOrders.length > 0 && (
    <motion.button 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={scrollToUnclaimed}
      className="shrink-0 flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl transition-all group"
    >
      <div className="relative">
        <IconAlertTriangle className="w-4 h-4 text-red-500" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
      </div>
      <span className="text-micro font-bold text-red-600 ">
        {unclaimedOrders.length} Overdue Pickups
      </span>
    </motion.button>
  )}
</motion.div>
            {/* --- 3. QUICK STATS --- */}
            <motion.div variants={itemVariants} id="step-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickStats title="Today's Sales" value={`₱${todayRevenue.toLocaleString()}`} icon={<IconTrendingUp />} bgColor="from-emerald-400 to-green-500 shadow-emerald-200" trend={`${todayOrders.length} orders`} />
              <QuickStats title="Pending" value={pendingOrders} icon={<IconClock />} bgColor="from-amber-400 to-orange-500 shadow-orange-200" trend="Needs attention" />
              <QuickStats title="In Progress" value={inProgress} icon={<IconPackage />} bgColor="from-blue-400 to-indigo-500 shadow-blue-200" trend="Being washed"/>
              <QuickStats title="Ready" value={readyOrders} icon={<IconCheckCircle />} bgColor="from-purple-400 to-pink-500 shadow-purple-200" trend="Notify users"/>
            </motion.div>

            {/* --- 4. DATA GRIDS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
              <div className="lg:col-span-6 space-y-6">
                <motion.div variants={itemVariants} id="step-today-orders">
                  <TodayOrders orders={todayOrders} isLoading={isLoading} />
                </motion.div>

                {/* --- 7. ATTACH THE REF HERE --- */}
                <motion.div ref={unclaimedRef} variants={itemVariants} id="step-unclaimed-orders">
                  <UnclaimedOrders />
                </motion.div>
              </div>
>>>>>>> Karen2.0

              <motion.div variants={itemVariants} id="step-activity" className="lg:col-span-6">
                <RecentActivity />
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}