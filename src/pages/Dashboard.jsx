import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useOrderStore } from '../store/orders/useOrderStore';
import StoreGuard from '../components/settings/StoreGuard';
// Component Imports
import CompactIntelligence from '../components/dashboard/CompactIntelligence';
import QuickActions from '../components/dashboard/QuickActions';
import QuickStats from '../components/dashboard/QuickStats';
import TodayOrders from '../components/dashboard/TodayOrders';
import UnclaimedOrders from '../components/dashboard/UnclaimedOrders';
import { IconCheckCircle, IconClock, IconPackage, IconDollarSign } from '../components/icons';
import { DashboardSkeleton } from '../components/skeleton-loader';

// ==========================================
// PERFORMANCE: ISOLATED LIVE CLOCK COMPONENT
// ==========================================
/**
 * @component LiveClockHeader
 * @description Renders the current date/time. Wrapped in React.memo to prevent 
 * unnecessary re-renders when the parent Dashboard state (like orders) updates.
 */
const LiveClockHeader = React.memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // SECURITY & PERF: 10s interval saves CPU cycles compared to 1000ms intervals.
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
    <header>
      <div className="flex items-center gap-3">
        {/* A11y: aria-live ensures screen readers announce the greeting gracefully */}
        <h1 className="text-h2 font-bold text-text-dark capitalize" aria-live="polite">
          {greeting}
        </h1>
      </div>
      <div>
        <div className="flex items-center justify-between text-white py-0.5 gap-2">
          {/* A11y: Use proper <time> semantics */}
          <time dateTime={time.toISOString()} className="text-text-dark/80 text-micro  ">
            {dateString}
          </time>
          <span className='text-micro text-text-dark/80 font-light select-none' aria-hidden="true"> | </span>
          <time dateTime={time.toISOString()} className="text-text-dark/70 text-micro ">
            {timeString}
          </time>
        </div>
      </div>
    </header>
  );
});
LiveClockHeader.displayName = 'LiveClockHeader';


// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
export default function Dashboard() {
  const { orders, isLoading, subscribeToOrders } = useOrderStore();


  // UI & Error State
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(true); // Default to true to prevent flash
  const [connectionError, setConnectionError] = useState(false);

  const unclaimedRef = useRef(null);

  // --- LIFECYCLE & SUBSCRIPTIONS ---
  useEffect(() => {
    let unsubscribe = () => { };
    let isMounted = true; // Prevents memory leaks if unmounted during fetch

    try {
      unsubscribe = subscribeToOrders();
      if (isMounted) setConnectionError(false);
    } catch (error) {
      console.error("[Dashboard] Connection error:", error);
      if (isMounted) setConnectionError(true);
    }

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribeToOrders]);

  useEffect(() => {
    let timer;
    let isMounted = true;

    if (isLoading) {
      timer = setTimeout(() => {
        if (isMounted) setShouldShowSkeleton(true);
      }, 300); // Optimized debounce time
    } else {
      setShouldShowSkeleton(false);
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isLoading]);


  // --- DATA AGGREGATION (FRONTEND) ---
  /**
   * ⚠️ ARCHITECTURE & SECURITY NOTE: FRONTEND VS BACKEND
   * This calculation is for UI/UX purposes ONLY. 
   * To prevent tampering, the authoritative `todayRevenue` MUST be validated and enforced 
   * by the backend (e.g., Firebase Cloud Functions & Firestore Security Rules).
   * Do NOT use this frontend calculated value to submit financial reports to the database.
   */
  const stats = useMemo(() => {
    const defaultStats = { todayOrders: [], todayRevenue: 0, pendingCount: 0, inProgressCount: 0, readyCount: 0 };
    if (!Array.isArray(orders)) return defaultStats;

    const now = new Date();
    const [d, m, y] = [now.getDate(), now.getMonth(), now.getFullYear()];

    // Use Array.reduce for functionally pure, single-pass O(N) iteration
    return orders.reduce((acc, o) => {
      // DATA GUARD: Ensure valid object structure
      if (!o || typeof o !== 'object') return acc;

      if (o.status === 'pending') acc.pendingCount++;
      else if (o.status === 'in_progress') acc.inProgressCount++;
      else if (o.status === 'ready') acc.readyCount++;

      if (o.created_date) {
        const orderDate = new Date(o.created_date);

        // Prevents NaN/Invalid Date errors
        if (!isNaN(orderDate.getTime()) &&
          orderDate.getDate() === d &&
          orderDate.getMonth() === m &&
          orderDate.getFullYear() === y) {

          acc.todayOrders.push(o);

          if (o.is_paid) {
            const amount = Number(o.total_amount);
            if (!isNaN(amount) && amount > 0) {
              acc.todayRevenue = Math.round((acc.todayRevenue + amount) * 100) / 100;
            }
          }
        }
      }
      return acc;
    }, defaultStats);
  }, [orders]);

  const revenue = Number(stats.todayRevenue) || 0;

  const formattedRevenue = revenue % 1 === 0
    ? revenue.toLocaleString() // Output: 150
    : revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // Output: 150.50


  // --- RENDER ---

  // UNHAPPY PATH: Network Failure Graceful Degradation
  if (connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app-light text-rose-600 " role="alert">
        <p>System connection issue. Please check your network and refresh.</p>
      </div>
    );
  }

  if (isLoading && shouldShowSkeleton) return <DashboardSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;

  return (
    <StoreGuard>
      <main className="min-h-screen bg-app-light p-2" aria-label="Main Dashboard">
        <div className="max-w-6xl mx-auto px-1 md:px-2">
          <div className="space-y-4">

            {/* --- 1. HEADER & ACTIONS --- */}
            <section className="flex flex-row justify-between gap-6 items-center" aria-label="Dashboard Header">
              <LiveClockHeader />
              <nav id="step-actions" aria-label="Quick Actions">
                <QuickActions />
              </nav>
            </section>

            {/* --- 2. INTELLIGENCE --- */}
            <section id="step-intelligence" className="flex flex-col md:flex-row items-center justify-between gap-4" aria-label="Intelligence and Alerts">
              <div className="flex-1 w-full">
                <CompactIntelligence />
              </div>
            </section>

            {/* --- 3. STATS --- */}
            <section id="step-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Key Performance Indicators">
              <QuickStats
                title="Today's Sales"
                value={`₱${formattedRevenue}`}
                icon={<IconDollarSign />}
                iconClass="text-emerald-600 stroke-emerald-600"
                trend={`${stats.todayOrders?.length || 0} orders`}
              />

              <QuickStats
                title="Pending"
                value={stats.pendingCount}
                icon={<IconClock />}
                iconClass="text-amber-600 stroke-amber-600"
                trend="Needs attention"
              />

              <QuickStats
                title="In Progress"
                value={stats.inProgressCount}
                icon={<IconPackage />}
                iconClass="text-blue-600 stroke-blue-600"
                trend="Being washed"
              />

              <QuickStats
                title="Ready"
                value={stats.readyCount}
                icon={<IconCheckCircle />}
                iconClass="text-violet-600 stroke-violet-600"
                trend="Notify customer"
              />
            </section>

            {/* --- 4. DATA GRIDS (SIDE BY SIDE ON DESKTOP) --- */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-20" aria-label="Order Data and Activity">

              {/* Takes up 2/3 of the screen on Desktop */}
              <div id="step-today-orders" className="lg:col-span-1">
                <TodayOrders orders={stats.todayOrders} isLoading={isLoading} />
              </div>

              {/* Takes up 1/3 of the screen on Desktop */}
              <div
                ref={unclaimedRef}
                id="step-unclaimed-orders"
                tabIndex={-1}
                className="lg:col-span-1 focus:outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-app-dark"
              >
                <UnclaimedOrders />
              </div>

            </section>

          </div>
        </div>
      </main>
    </StoreGuard>
  );
}