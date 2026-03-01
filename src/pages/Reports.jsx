import { motion } from "framer-motion";
import { useEffect, useState, memo, useMemo } from "react";
import { useReportStore } from "../store/reports/useReportStore";
import ExportOrdersButton from "../components/reports/ExportOrdersButton";

// Component Imports
import CustomerMix from "../components/reports/CustomerMix";
import KpiCards from "../components/reports/KpiCards";
import RushPulse from "../components/reports/RushPulse";
import SalesPerformance from "../components/reports/SalesPerformance";
import TopCustomers from "../components/reports/TopCustomers";
import PopularServicesCard from "../components/reports/PopularServicesCard";
import { ReportsSkeleton } from "../components/skeleton-loader";

// --- PERFORMANCE: ISOLATED CLOCK ---
// This ensures that the 1-second interval only re-renders this tiny component
// instead of the entire reports dashboard and its heavy charts.
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
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
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
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  // SECURE CHECK: Ensure orders is always an array to prevent .length crashes
  const hasOrders = useMemo(() => Array.isArray(orders) && orders.length > 0, [orders]);

  // 1. DATA SUBSCRIPTION
  useEffect(() => {
    const unsubscribe = subscribeToReports();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribeToReports]);

  // 2. LOADING STATE MANAGEMENT (Prevents skeleton flickering)
  useEffect(() => {
    let timer;
    if (isLoading && !hasOrders) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 400);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading, hasOrders]);

  // --- ERROR HANDLING & EMPTY STATES ---
  if (isLoading && shouldShowSkeleton && !hasOrders) {
    return <ReportsSkeleton />;
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-app-light text-slate-900 p-2 overflow-x-hidden"
    >
      <div className="max-w-6xl mx-auto px-1 md:px-2 pb-10">
        
        <motion.header 
          variants={itemVariants} 
          className="flex flex-row justify-between items-center px-1 mb-6"
        >
          <div className="flex flex-col">
            <h1 className="text-h2 font-bold text-text-dark leading-tight">Reports</h1>
            <ReportHeaderClock />
          </div>

          <div className="shrink-0">
            <ExportOrdersButton />
          </div>
        </motion.header>

        {/* MAIN DASHBOARD GRID */}
        {!isLoading && !hasOrders ? (
          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-medium italic text-sm-text">No order data found for reporting.</p>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-4 gap-4"
            variants={containerVariants}
          >
            {/* KPI Section */}
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <KpiCards range="7" />
            </motion.div>

            {/* Sales Chart Section */}
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <SalesPerformance range="7" />
            </motion.div>

            {/* Rush Analysis Section */}
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <RushPulse range="7" />
            </motion.div>

            {/* Mixed Data Row */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <CustomerMix range="7" />
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-2">
              <TopCustomers range="7" />
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-2">
              <PopularServicesCard range="7" />
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}