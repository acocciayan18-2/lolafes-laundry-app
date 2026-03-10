import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, memo, useMemo } from "react";
import { useReportStore } from "../store/reports/useReportStore";
import { useOrderStore } from "../store/orders/useOrderStore";
import ExportOrdersButton from "../components/reports/ExportOrdersButton";

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

// --- PERFORMANCE: ISOLATED CLOCK ---
const ReportHeaderClock = memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 mt-0.5">
      <p className="text-text-dark/80 text-micro font-medium whitespace-nowrap">
        {time.toLocaleDateString('en-US', { 
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
        })}
      </p>
      <span className='text-micro text-text-dark/80 font-light select-none'>|</span>
      <span className="text-micro font-medium text-text-dark/80 uppercase whitespace-nowrap">
        {time.toLocaleTimeString([], { 
          hour: '2-digit', minute: '2-digit', hour12: true 
        })}
      </span>
    </div>
  );
});

ReportHeaderClock.displayName = 'ReportHeaderClock';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function Reports() {
  const { subscribeToReports, isLoading, orders } = useReportStore();
  const { cancelledOrders, subscribeToCancelledOrders } = useOrderStore();
  
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // 1. Network Status Listener
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

  // 3. Strict Data Guarding
  const safeOrders = useMemo(() => Array.isArray(orders) ? orders : [], [orders]);
  const safeCancelledOrders = useMemo(() => Array.isArray(cancelledOrders) ? cancelledOrders : [], [cancelledOrders]);

  // ✨ FIX: The dashboard now checks if ANY data exists (active or cancelled)
  const hasAnyData = safeOrders.length > 0 || safeCancelledOrders.length > 0;

  const totalLost = useMemo(() => {
    return safeCancelledOrders.reduce((sum, order) => {
      const amount = Math.max(0, Number(order?.total_amount) || 0);
      return sum + amount;
    }, 0);
  }, [safeCancelledOrders]);

  const hasRewards = useMemo(() => {
    return safeOrders.some(order => {
      if (!order) return false;
      const hasPointsDeducted = Number(order.loyalty_points_to_deduct || 0) > 0;
      const hasRewardService = Array.isArray(order.services) && order.services.some(s => s?.is_reward === true);
      return hasPointsDeducted || hasRewardService;
    });
  }, [safeOrders]);

  useEffect(() => {
    let timer;
    if (isLoading) {
      setShouldShowSkeleton(true);
    } else {
      timer = setTimeout(() => setShouldShowSkeleton(false), 300);
    }
    return () => clearTimeout(timer);
  }, [isLoading, orders]);

  return (
    <div className="min-h-screen bg-app-light p-2">
      <div className="max-w-6xl mx-auto px-1 md:px-2 pb-20">
        
        <header className="flex flex-row justify-between items-start md:items-center mb-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-h2 font-bold text-text-dark">Reports</h1>
              {isOffline && (
                <span className="text-micro font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full animate-pulse">
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

        <AnimatePresence mode="wait">
          {shouldShowSkeleton ? (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ReportsSkeleton />
              </motion.div>
          ) : !hasAnyData ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center shadow-sm">
                <div className="w-16 h-16 mx-auto mb-3 bg-slate-50 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h3 className="text-sm-text font-bold text-text-dark">No data available</h3>
                <p className="text-micro text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                  Process or cancel some orders to generate analytics.
                </p>
              </motion.div>
          ) : (
            <motion.div key="content" className="flex flex-col gap-4" variants={containerVariants} initial="hidden" animate="visible">
              
              {safeOrders.length > 0 && (
                <>
                  <motion.div variants={itemVariants} className="w-full">
                    <KpiCards range="7" />
                  </motion.div>
                  <motion.div variants={itemVariants} className="w-full">
                    <SalesPerformance range="7" />
                  </motion.div>
                  <motion.div variants={itemVariants} className="w-full">
                    <RushPulse range="7" />
                  </motion.div>
                </>
              )}

              <div className="columns-1 lg:columns-2 gap-4 w-full mt-2">
                
                {safeOrders.length > 0 && (
                  <>
                    <motion.div variants={itemVariants} className="break-inside-avoid mb-4 block">
                      <CustomerMix range="7" />
                    </motion.div>
                    <motion.div variants={itemVariants} className="break-inside-avoid mb-4 block">
                      <TopCustomers range="7" />
                    </motion.div>
                    <motion.div variants={itemVariants} className="break-inside-avoid mb-4 block">
                      <PopularServicesCard range="7" />
                    </motion.div>
                  </>
                )}

                {/* ✨ FIX: Cancelled Orders now renders independently of the successful orders */}
                {safeCancelledOrders.length > 0 && (
                  <motion.div variants={itemVariants} className="break-inside-avoid mb-4 block">
                    <CancelledOrdersList 
                      cancelledOrders={safeCancelledOrders} 
                      totalLost={totalLost} 
                    />
                  </motion.div>
                )}

                {hasRewards && (
                  <motion.div variants={itemVariants} className="break-inside-avoid mb-4 block">
                      <RewardRecipients orders={safeOrders} />
                  </motion.div>
                )}
                
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}