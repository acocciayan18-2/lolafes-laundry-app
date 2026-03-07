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
      <p className="text-text-dark text-sm-text font-medium whitespace-nowrap">
        {time.toLocaleDateString('en-US', { 
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
        })}
      </p>
      <span className='text-sm-text text-text-dark/20 font-light select-none'>|</span>
      <span className="text-sm-text font-medium text-text-dark uppercase whitespace-nowrap">
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

  useEffect(() => {
    const unsubscribe = subscribeToReports();
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [subscribeToReports]);

  useEffect(() => {
    const unsubscribe = subscribeToCancelledOrders();
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [subscribeToCancelledOrders]);

  const totalLost = useMemo(() => {
    return cancelledOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [cancelledOrders]);

  const hasOrders = useMemo(() => Array.isArray(orders) && orders.length > 0, [orders]);

  const hasRewards = useMemo(() => {
    return orders?.some(order => 
      Number(order.loyalty_points_to_deduct || 0) > 0 || 
      order.services?.some(s => s.is_reward === true)
    );
  }, [orders]);

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
        
        <header className="flex flex-row justify-between items-center mb-1">
          <div className="flex flex-col">
            <h1 className="text-h2 font-bold text-text-dark">Reports</h1>
            <ReportHeaderClock />
          </div>
          <ExportOrdersButton />
        </header>

        <AnimatePresence mode="wait">
          {shouldShowSkeleton ? (
             <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <ReportsSkeleton />
             </motion.div>
          ) : !hasOrders ? (
             <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
               <p className="text-slate-400 font-medium italic">No data found.</p>
             </motion.div>
          ) : (
            <motion.div key="content" className="flex flex-col gap-4" variants={containerVariants} initial="hidden" animate="visible">
              
              {/* TOP ANCHORS */}
              <motion.div variants={itemVariants} className="w-full">
                <KpiCards range="7" />
              </motion.div>
              
              <motion.div variants={itemVariants} className="w-full">
                <SalesPerformance range="7" />
              </motion.div>
              
              <motion.div variants={itemVariants} className="w-full">
                <RushPulse range="7" />
              </motion.div>

              {/* GALLERY SECTION (Masonry / Columns) */}
              <div className="columns-1 lg:columns-2 gap-4 w-full mt-2">
                
                <motion.div variants={itemVariants} className="break-inside-avoid mb-4 block">
                  <CustomerMix range="7" />
                </motion.div>
                
                <motion.div variants={itemVariants} className="break-inside-avoid mb-4 block">
                  <TopCustomers range="7" />
                </motion.div>

                <motion.div variants={itemVariants} className="break-inside-avoid mb-4 block">
                  <PopularServicesCard range="7" />
                </motion.div>

                {/* CANCELLED ORDERS (Conditional) */}
                {cancelledOrders.length > 0 && (
                  <motion.div variants={itemVariants} className="break-inside-avoid mb-4 block">
                    <CancelledOrdersList 
                      cancelledOrders={cancelledOrders} 
                      totalLost={totalLost} 
                    />
                  </motion.div>
                )}

                {/* REWARD RECIPIENTS (Conditional) */}
                {hasRewards && (
                  <motion.div variants={itemVariants} className="break-inside-avoid mb-4 block">
                     <RewardRecipients orders={orders} />
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