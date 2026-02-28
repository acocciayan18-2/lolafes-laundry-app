import { motion } from "framer-motion";
import { useEffect, useState} from "react";
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

// ... (previous imports)

export default function Reports() {
  const { subscribeToReports, isLoading, orders } = useReportStore();
  
  // Removed [range, setRange] to fix the 'unused' warning
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  const hasOrders = orders && orders.length > 0;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const unsubscribe = subscribeToReports();
    return () => {
      clearInterval(timer);
      if (unsubscribe) unsubscribe();
    };
  }, [subscribeToReports]);

  useEffect(() => {
    let timer;
    if (isLoading && !hasOrders) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 500);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading, hasOrders]);

  if (isLoading && shouldShowSkeleton && !hasOrders) {
    return <ReportsSkeleton />;
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-app-light text-slate-900 p-2"
    >
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        
        <motion.header 
          variants={itemVariants} 
          className="flex flex-row justify-between items-center px-1 mb-6"
        >
          <div className="flex flex-col">
            <h1 className="text-h2 font-bold text-text-dark leading-tight">Reports</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-text-dark text-sm-text font-medium whitespace-nowrap">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                })}
              </p>
              <span className='text-sm-text text-text-dark/20 font-light select-none'>|</span>
              <span className="text-sm-text font-medium text-text-dark uppercase whitespace-nowrap">
                {currentTime.toLocaleTimeString([], { 
                  hour: '2-digit', minute: '2-digit', hour12: true 
                })}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <ExportOrdersButton />
          </div>
        </motion.header>

        {/* MAIN DASHBOARD GRID */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-4 gap-4"
          variants={containerVariants}
        >
          {/* We now pass a static "7" (default) or let components handle their own state */}
          <motion.div variants={itemVariants} className="lg:col-span-4">
            <KpiCards range="7" />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-4">
            <SalesPerformance range="7" />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-4">
            <RushPulse range="7" />
          </motion.div>

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
      </div>
    </motion.div>
  );
}