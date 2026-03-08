import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useRef, useMemo } from 'react'; 
import { useOrderStore } from '../store/orders/useOrderStore';
import { useUnclaimedStore } from '../store/orders/useUnclaimedStore'; 
import StoreGuard from '../components/settings/StoreGuard';

// Component Imports
import CompactIntelligence from '../components/dashboard/CompactIntelligence';
import QuickActions from '../components/dashboard/QuickActions';
import QuickStats from '../components/dashboard/QuickStats';
import RecentActivity from '../components/dashboard/RecentActivity';
import TodayOrders from '../components/dashboard/TodayOrders';
import UnclaimedOrders from '../components/dashboard/UnclaimedOrders';
import { IconAlertTriangle, IconCheckCircle, IconClock, IconPackage, IconTrendingUp } from '../components/icons';
import { DashboardSkeleton } from '../components/skeleton-loader';

// --- CONFIGURATIONS ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

// ==========================================
// PERFORMANCE: ISOLATED LIVE CLOCK COMPONENT
// By moving the 1-second interval into this tiny component, 
// ONLY this specific text re-renders every second, saving the rest of the dashboard!
// ==========================================
const LiveClockHeader = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const greeting = hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-text-dark capitalize">
          {greeting}
        </h1>
      </div>
      <div>
        <div className="flex items-center justify-between text-white py-0.5 gap-2">
          <p className="text-text-dark text-sm-text font-medium ">
            {time.toLocaleDateString('en-US', { 
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
            })}
          </p>
          <span className='text-sm-text text-text-dark/20 font-light select-none'> | </span>
          <span className="text-text-dark text-sm-text font-medium">
            {time.toLocaleTimeString([], { 
              hour: '2-digit', minute: '2-digit', hour12: true 
            }).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { orders, isLoading, subscribeToOrders } = useOrderStore();
  const { unclaimedOrders } = useUnclaimedStore(); 
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);
  
  const unclaimedRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrders();
    return () => unsubscribe && unsubscribe();
  }, [subscribeToOrders]);

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

  const scrollToUnclaimed = () => {
    unclaimedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ==========================================
  // PERFORMANCE: MEMOIZED CALCULATIONS
  // Stops the dashboard from recounting hundroses of orders on every minor state change
  // ==========================================
  const { todayOrders, todayRevenue, pendingCount, inProgressCount, readyCount } = useMemo(() => {
    if (!orders) return { todayOrders: [], todayRevenue: 0, pendingCount: 0, inProgressCount: 0, readyCount: 0 };

    const now = new Date();
    // Using simple string comparison for "Today" is extremely fast
    const todayString = now.toLocaleDateString();

    const todayList = [];
    let revenue = 0;
    let pending = 0;
    let inProgress = 0;
    let ready = 0;

    // Single pass loop to calculate everything at once
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      
      // Calculate specific status counts for all time (if that's the intended logic)
      if (o.status === 'pending') pending++;
      else if (o.status === 'in_progress') inProgress++;
      else if (o.status === 'ready') ready++;

      // Safely parse date and check if it's today
      if (o.created_date) {
         const orderDate = new Date(o.created_date);
         if (!isNaN(orderDate.getTime()) && orderDate.toLocaleDateString() === todayString) {
            todayList.push(o);
            if (o.is_paid) {
               revenue += (Number(o.total_amount) || 0);
            }
         }
      }
    }

    return {
      todayOrders: todayList,
      todayRevenue: revenue,
      pendingCount: pending,
      inProgressCount: inProgress,
      readyCount: ready
    };
  }, [orders]);

  if (isLoading && shouldShowSkeleton) return <DashboardSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;

  return (
     <StoreGuard> 
            <div className="min-h-screen bg-app-light p-2">
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
            <motion.div variants={itemVariants} className="flex flex-row justify-between gap-6 items-start">
              {/* Using the new Isolated Component */}
              <LiveClockHeader />

              <div id="step-actions">
                <QuickActions />
              </div>
            </motion.div>

            {/* --- 2. INTELLIGENCE & ALERTS ROW --- */}
            <motion.div variants={itemVariants} id="step-intelligence" className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full">
                <CompactIntelligence />
              </div>

              {unclaimedOrders.length > 0 && (
                <motion.button 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={scrollToUnclaimed}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-rose-400"
                  aria-label={`Scroll to ${unclaimedOrders.length} overdue orders`}
                >
                  <div className="relative">
                    <IconAlertTriangle className="w-4 h-4 text-rose-500" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  </div>
                  <span className="text-micro font-medium text-rose-500 ">
                    {unclaimedOrders.length} Overdue Order{unclaimedOrders.length !== 1 ? 's' : ''}
                  </span>
                </motion.button>
              )}
            </motion.div>

            {/* --- 3. QUICK STATS --- */}
            <motion.div variants={itemVariants} id="step-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickStats title="Today's Sales" value={`₱${todayRevenue.toLocaleString()}`} icon={<IconTrendingUp />} bgColor="from-emerald-400 to-green-500 shadow-emerald-200" trend={`${todayOrders.length} orders`} />
              <QuickStats title="Pending" value={pendingCount} icon={<IconClock />} bgColor="from-amber-400 to-orange-500 shadow-orange-200" trend="Needs attention" />
              <QuickStats title="In Progress" value={inProgressCount} icon={<IconPackage />} bgColor="from-blue-400 to-indigo-500 shadow-blue-200" trend="Being washed"/>
              <QuickStats title="Ready" value={readyCount} icon={<IconCheckCircle />} bgColor="from-purple-400 to-pink-500 shadow-purple-200" trend="Notify customer"/>
            </motion.div>

            {/* --- 4. DATA GRIDS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pb-20">
              <div className="lg:col-span-6 space-y-3">
                <motion.div variants={itemVariants} id="step-today-orders">
                  <TodayOrders orders={todayOrders} isLoading={isLoading} />
                </motion.div>

                <motion.div ref={unclaimedRef} variants={itemVariants} id="step-unclaimed-orders">
                  <UnclaimedOrders />
                </motion.div>
              </div>

              <motion.div variants={itemVariants} id="step-activity" className="lg:col-span-6">
                <RecentActivity />
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    </div>
          </StoreGuard>
  );
}