import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Store & Tour Imports
import { useOrderStore } from '../store/orders/useOrderStore';
import { startGlobalTour } from '../tours/globalTours';

// Component Imports
import CompactIntelligence from '../components/dashboard/CompactIntelligence';
import QuickActions from '../components/dashboard/QuickActions';
import QuickStats from '../components/dashboard/QuickStats';
import RecentActivity from '../components/dashboard/RecentActivity';
import TodayOrders from '../components/dashboard/TodayOrders';
import { IconCheckCircle, IconClock, IconPackage, IconTrendingUp } from '../components/icons';
import { DashboardSkeleton } from '../components/skeleton-loader';

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
  // 1. ROUTING HOOKS
  const location = useLocation();
  const navigate = useNavigate();

  // 2. STORE DATA (Initialized before the useEffect to avoid ReferenceErrors)
  const { orders, isLoading, subscribeToOrders } = useOrderStore();
  
  // 3. LOCAL STATE
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  // 4. TOUR RECEIVER LOGIC
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    // Runs if URL has ?tour=active OR if no tour has ever been completed
    const hasCompletedTour = localStorage.getItem('lola_tour_done');
    
    if ((searchParams.get('tour') === 'active' || !hasCompletedTour) && !isLoading) {
      const timer = setTimeout(() => {
        // Start from index 0 for Dashboard
        startGlobalTour(navigate, null, 0); 
      }, 1200); // 1.2s delay to allow Framer Motion animations to settle
      return () => clearTimeout(timer);
    }
  }, [location.search, isLoading, navigate]);

  // 5. FIREBASE SUBSCRIPTION
  useEffect(() => {
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe && unsubscribe();
  }, [subscribeToOrders]);

  // 6. CLOCK TIMER
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 7. SKELETON DELAY LOGIC (400ms)
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 400);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

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

  // --- RENDERING LOGIC ---

  if (isLoading && shouldShowSkeleton) {
    return <DashboardSkeleton />;
  }

  if (isLoading && !shouldShowSkeleton) {
    return null; 
  }

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
              <div id="step-actions">
                <QuickActions />
              </div>
            </motion.div>

            {/* --- 2. INTELLIGENCE TICKER --- */}
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