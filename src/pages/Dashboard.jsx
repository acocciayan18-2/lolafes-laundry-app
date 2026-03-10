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

// ==========================================
// PERFORMANCE: ISOLATED LIVE CLOCK COMPONENT
// ==========================================
const LiveClockHeader = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // SECURITY & PERF: We only display minutes, so updating every 10s is sufficient.
    // This saves CPU cycles and battery life compared to 1000ms intervals.
    const timer = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const greeting = hours < 12 ? "Good morning" : hours < 18 ? "Good afternoon" : "Good evening";

  // Robust locale formatting to prevent browser-specific rendering bugs
  const dateString = new Intl.DateTimeFormat('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
  }).format(time);

  const timeString = new Intl.DateTimeFormat('en-US', { 
    hour: '2-digit', minute: '2-digit', hour12: true 
  }).format(time).toUpperCase();

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-h2 font-bold text-text-dark capitalize">
          {greeting}
        </h1>
      </div>
      <div>
        <div className="flex items-center justify-between text-white py-0.5 gap-2">
          <p className="text-text-dark/80 text-micro font-medium ">
            {dateString}
          </p>
          <span className='text-micro text-text-dark/80 font-light select-none'> | </span>
          <span className="text-text-dark/70 text-micro font-medium">
            {timeString}
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

  // Safe fallback in case the store state temporarily returns null/undefined
  const safeUnclaimedOrders = Array.isArray(unclaimedOrders) ? unclaimedOrders : [];

  useEffect(() => {
    let unsubscribe;
    try {
      // Safe execution in case the network layer rejects the subscription
      unsubscribe = subscribeToOrders();
    } catch (error) {
      console.error("Dashboard connection error:", error);
    }
    
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
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
  // DATA INTEGRITY: MEMOIZED & SECURED CALCULATIONS
  // ==========================================
  const { todayOrders, todayRevenue, pendingCount, inProgressCount, readyCount } = useMemo(() => {
    if (!Array.isArray(orders)) return { todayOrders: [], todayRevenue: 0, pendingCount: 0, inProgressCount: 0, readyCount: 0 };

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    const todayList = [];
    let revenue = 0;
    let pending = 0;
    let inProgress = 0;
    let ready = 0;

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      
      // DATA GUARD: Ensure the order is a valid object before accessing properties
      if (!o || typeof o !== 'object') continue;

      if (o.status === 'pending') pending++;
      else if (o.status === 'in_progress') inProgress++;
      else if (o.status === 'ready') ready++;

      if (o.created_date) {
         const orderDate = new Date(o.created_date);
         
         // DATA GUARD: Ensure the date parsed successfully (prevents NaN errors)
         if (!isNaN(orderDate.getTime())) {
           // More precise and locale-safe comparison than comparing .toLocaleDateString()
           if (
             orderDate.getFullYear() === todayYear &&
             orderDate.getMonth() === todayMonth &&
             orderDate.getDate() === todayDate
           ) {
              todayList.push(o);
              
              if (o.is_paid) {
                 const amount = Number(o.total_amount);
                 // DATA GUARD: Ensure no corrupted strings result in NaN revenue
                 if (!isNaN(amount) && amount > 0) {
                   revenue += amount;
                 }
              }
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
        <div className="max-w-6xl mx-auto px-1 md:px-2">
            <div className="space-y-4">
              
              {/* --- 1. HEADER & ACTIONS --- */}
              <div className="flex flex-row justify-between gap-6 items-center">
                <LiveClockHeader />

                <div id="step-actions">
                  <QuickActions />
                </div>
              </div>

              {/* --- 2. INTELLIGENCE & ALERTS ROW --- */}
              <div id="step-intelligence" className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full">
                  <CompactIntelligence />
                </div>

                {safeUnclaimedOrders.length > 0 && (
                  <button 
                    onClick={scrollToUnclaimed}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-rose-400"
                    aria-label={`Scroll to ${safeUnclaimedOrders.length} overdue orders`}
                  >
                    <div className="relative">
                      <IconAlertTriangle className="w-4 h-4 text-rose-500" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                    </div>
                    <span className="text-micro font-medium text-rose-500 ">
                      {safeUnclaimedOrders.length} Overdue Order{safeUnclaimedOrders.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                )}
              </div>

              {/* --- 3. QUICK STATS --- */}
              <div id="step-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickStats title="Today's Sales" value={`₱${todayRevenue.toLocaleString()}`} icon={<IconTrendingUp />} bgColor="from-emerald-400 to-green-500 shadow-emerald-200" trend={`${todayOrders.length} orders`} />
                <QuickStats title="Pending" value={pendingCount} icon={<IconClock />} bgColor="from-amber-400 to-orange-500 shadow-orange-200" trend="Needs attention" />
                <QuickStats title="In Progress" value={inProgressCount} icon={<IconPackage />} bgColor="from-blue-400 to-indigo-500 shadow-blue-200" trend="Being washed"/>
                <QuickStats title="Ready" value={readyCount} icon={<IconCheckCircle />} bgColor="from-purple-400 to-pink-500 shadow-purple-200" trend="Notify customer"/>
              </div>

              {/* --- 4. DATA GRIDS --- */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pb-20">
                <div className="lg:col-span-6 space-y-3">
                  <div id="step-today-orders">
                    <TodayOrders orders={todayOrders} isLoading={isLoading} />
                  </div>

                  <div ref={unclaimedRef} id="step-unclaimed-orders">
                    <UnclaimedOrders />
                  </div>
                </div>

                <div id="step-activity" className="lg:col-span-6">
                  <RecentActivity />
                </div>
              </div>
              
            </div>
        </div>
      </div>
    </StoreGuard>
  );
}