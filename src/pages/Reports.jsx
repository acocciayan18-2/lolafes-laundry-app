/**
 * @file Reports.jsx
 * @description Enterprise Analytics Dashboard for Lola Fe's POS.
 * Implements Atomic Zustand Selectors, robust network resilience, and A11y standards.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, memo, useMemo, useCallback } from "react";
import { useReportStore } from "../store/reports/useReportStore";
import { useOrderStore } from "../store/orders/useOrderStore";
import ExportOrdersButton from "../components/reports/ExportOrdersButton";
import DeletedCustomersBoard from '../components/reports/DeletedCustomersBoard';

// Component Imports
import CustomerMix from "../components/reports/CustomerMix";
import KpiCards from "../components/reports/KpiCards";
import RushPulse from "../components/reports/RushPulse";
import SalesPerformance from "../components/reports/SalesPerformance";
import TopCustomers from "../components/reports/TopCustomers";
import PopularServicesCard from "../components/reports/PopularServicesCard";
import { ReportsSkeleton } from "../components/skeleton-loader";
import { CancelledOrdersList } from "../components/reports/CancelledOrdersList";
import RewardRecipients from '../components/reports/RewardRecipients';

const ReportHeaderClock = memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 mt-0.5" aria-live="polite" aria-atomic="true">
      <p className="text-text-dark/80 text-micro  whitespace-nowrap">
        {time.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        })}
      </p>
      <span className='text-micro text-text-dark/80 font-light select-none' aria-hidden="true">|</span>
      <span className="text-micro  text-text-dark/80 uppercase whitespace-nowrap">
        {time.toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit', hour12: true
        })}
      </span>
    </div>
  );
});

ReportHeaderClock.displayName = 'ReportHeaderClock';

export default function Reports() {
  // 🛡️ PERFORMANCE: Atomic Selectors. 
  const subscribeToReports = useReportStore(useCallback(state => state.subscribeToReports, []));
  const isLoading = useReportStore(useCallback(state => state.isLoading, []));
  const orders = useReportStore(useCallback(state => state.orders, []));

  const subscribeToCancelledOrders = useOrderStore(useCallback(state => state.subscribeToCancelledOrders, []));
  const cancelledOrders = useOrderStore(useCallback(state => state.cancelledOrders, []));

  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasDeletedCustomers, setHasDeletedCustomers] = useState(true);

  // 1. Network Status Listener (Resilience)
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Firebase Subscriptions
  useEffect(() => {
    const unsubscribeReports = subscribeToReports();
    const unsubscribeCancelled = subscribeToCancelledOrders();

    return () => {
      if (typeof unsubscribeReports === 'function') unsubscribeReports();
      if (typeof unsubscribeCancelled === 'function') unsubscribeCancelled();
    };
  }, [subscribeToReports, subscribeToCancelledOrders]);

  // 3. Strict Data Guarding & Memoization
  const safeOrders = useMemo(() => Array.isArray(orders) ? orders : [], [orders]);
  const safeCancelledOrders = useMemo(() => Array.isArray(cancelledOrders) ? cancelledOrders : [], [cancelledOrders]);

  const hasAnyData = safeOrders.length > 0 || safeCancelledOrders.length > 0;

  // Single-pass reduction for performance
  const totalLost = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < safeCancelledOrders.length; i++) {
      sum += Math.max(0, Number(safeCancelledOrders[i]?.total_amount) || 0);
    }
    return sum;
  }, [safeCancelledOrders]);

  // Optimized Array.some() with early exit
  const hasRewards = useMemo(() => {
    return safeOrders.some(order => {
      if (!order) return false;
      if (Number(order.loyalty_points_to_deduct || 0) > 0) return true;
      if (Array.isArray(order.services)) {
        for (let i = 0; i < order.services.length; i++) {
          if (order.services[i]?.is_reward === true) return true;
        }
      }
      return false;
    });
  }, [safeOrders]);

  // Loading State Debouncer
  useEffect(() => {
    let timer;
    if (isLoading) {
      setShouldShowSkeleton(true);
    } else {
      timer = setTimeout(() => setShouldShowSkeleton(false), 250);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  return (
    <main className="min-h-screen bg-app-light p-2" aria-busy={shouldShowSkeleton}>
      <div className="max-w-6xl mx-auto px-1 md:px-2 pb-20">

        <AnimatePresence mode="wait">
          {shouldShowSkeleton ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReportsSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} // Snappy, immediate fade-in
              className="flex flex-col"
            >
              {/* ✨ Header is now bundled inside the revealed content */}
              <header className="flex flex-row justify-between items-start md:items-center mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <h1 className="text-h2 font-bold text-text-dark">Reports</h1>
                    {isOffline && (
                      <span
                        role="alert"
                        aria-live="assertive"
                        className="text-micro font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full animate-pulse"
                      >
                        Offline Mode
                      </span>
                    )}
                  </div>
                  <ReportHeaderClock />
                </div>

                <div className={isOffline || safeOrders.length === 0 ? "opacity-50 pointer-events-none" : ""}>
                  <ExportOrdersButton disabled={isOffline || safeOrders.length === 0} />
                </div>
              </header>

              {!hasAnyData ? (
                <div className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center shadow-sm">
                  <div className="w-16 h-16 mx-auto mb-3 bg-slate-50 rounded-full flex items-center justify-center" aria-hidden="true">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <h3 className="text-sm-text font-bold text-text-dark">No data available</h3>
                  <p className="text-micro text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Process or cancel some orders to generate analytics.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">

                  {/* Top Row Full-Width Metrics */}
                  {safeOrders.length > 0 && (
                    <>
                      <div className="w-full">
                        <KpiCards range="7" />
                      </div>
                      <div className="w-full">
                        <SalesPerformance range="7" />
                      </div>
                      <div className="w-full">
                        <RushPulse range="7" />
                      </div>
                    </>
                  )}

                  {/* Masonry Grid (2 Columns on Desktop) */}
                  <div className="columns-1 lg:columns-2 gap-4 w-full mt-2">
                    {safeOrders.length > 0 && (
                      <>
                        <div className="break-inside-avoid mb-4 block">
                          <CustomerMix range="7" />
                        </div>
                        <div className="break-inside-avoid mb-4 block">
                          <TopCustomers range="7" />
                        </div>
                        <div className="break-inside-avoid mb-4 block">
                          <PopularServicesCard range="7" />
                        </div>
                      </>
                    )}

                    {safeCancelledOrders.length > 0 && (
                      <div className="break-inside-avoid mb-4 block">
                        <CancelledOrdersList
                          cancelledOrders={safeCancelledOrders}
                          totalLost={totalLost}
                        />
                      </div>
                    )}

                    {hasRewards && (
                      <div className="break-inside-avoid mb-4 block">
                        <RewardRecipients orders={safeOrders} />
                      </div>
                    )}

                    <div className={`break-inside-avoid ${hasDeletedCustomers ? 'mb-4 block' : 'hidden'}`}>
                      <DeletedCustomersBoard onDataStatus={setHasDeletedCustomers} />
                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}