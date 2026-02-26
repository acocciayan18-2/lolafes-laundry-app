import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useReportStore } from "../store/reports/useReportStore";
import ExportOrdersButton from "../components/reports/ExportOrdersButton";
import CustomerMix from "../components/reports/CustomerMix";
import KpiCards from "../components/reports/KpiCards";
import RushPulse from "../components/reports/RushPulse";
import SalesPerformance from "../components/reports/SalesPerformance";
import TopCustomers from "../components/reports/TopCustomers";
import { ReportsSkeleton } from "../components/skeleton-loader";

// TOUR IMPORTS
import { useLocation, useNavigate } from 'react-router-dom';
import { startGlobalTour } from '../tours/globalTours';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } },
};

export default function Reports() {
  const location = useLocation();
  const navigate = useNavigate();
  const { subscribeToReports, isLoading } = useReportStore();
  
  const [dateRange] = useState("7"); 
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  // 1. Clock & Subscription
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const unsubscribe = subscribeToReports();
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [subscribeToReports]);

  // 2. Skeleton Delay
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 500);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // 3. Tour Logic (MUST BE BEFORE CONDITIONAL RETURNS)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const isTourActive = searchParams.get('tour') === 'active';
    
    if (isTourActive && !isLoading) {
      const timer = setTimeout(() => {
        startGlobalTour(navigate);
      }, 1200); 
      return () => clearTimeout(timer);
    }
  }, [location.search, isLoading, navigate]);

  // --- RENDERING LOGIC ---
  if (isLoading && shouldShowSkeleton) return <ReportsSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen bg-app-light text-slate-900 p-2">
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        {/* ADDED ID: step-reports-header */}
        <motion.header id="step-reports-header" variants={itemVariants} className="flex flex-row justify-between items-center mb-6 px-1">
          <div className="flex flex-col">
            <h1 className="text-h2 font-bold text-text-dark leading-tight">Reports</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-text-dark text-micro font-medium">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
              <span className='text-sm-text text-text-dark/20'>|</span>
              <span className="text-micro font-medium text-text-dark uppercase">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="shrink-0"><ExportOrdersButton /></div>
        </motion.header>

        <motion.div className="grid grid-cols-1 lg:grid-cols-4 gap-4" variants={containerVariants}>
          {/* ADDED ID: step-reports-kpi */}
          <motion.div id="step-reports-kpi" variants={itemVariants} className="lg:col-span-4">
            <KpiCards range={dateRange} />
          </motion.div>

          {/* ADDED ID: step-reports-performance */}
          <motion.div id="step-reports-performance" variants={itemVariants} className="lg:col-span-4">
            <SalesPerformance range={dateRange} />
          </motion.div>

          {/* ADDED ID: step-reports-rush */}
          <motion.div id="step-reports-rush" variants={itemVariants} className="lg:col-span-4">
            <RushPulse range={dateRange} />
          </motion.div>

          {/* ADDED ID: step-reports-mix */}
          <motion.div id="step-reports-mix" variants={itemVariants} className="lg:col-span-2">
            <CustomerMix range={dateRange} />
          </motion.div>

          {/* ADDED ID: step-reports-top */}
          <motion.div id="step-reports-top" variants={itemVariants} className="lg:col-span-2">
            <TopCustomers range={dateRange} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}