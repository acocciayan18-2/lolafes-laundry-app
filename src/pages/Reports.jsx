import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useReportStore } from "../store/reports/useReportStore";

// Component Imports
import CustomerMix from "../components/reports/CustomerMix";
import KpiCards from "../components/reports/KpiCards";
import RushPulse from "../components/reports/RushPulse";
import SalesPerformance from "../components/reports/SalesPerformance";
import TopCustomers from "../components/reports/TopCustomers";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
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
  const { subscribeToReports, isLoading } = useReportStore();
  
  // FIX: Removed setDateRange to clear 'assigned a value but never used' error
  const [dateRange] = useState("7"); 
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const unsubscribe = subscribeToReports();
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [subscribeToReports]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-light">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-6 h-6 border-2 border-app-dark/10 border-t-app-dark rounded-full animate-spin" />
          <p className="text-sm-text text-text-dark/70 font-medium">Loading reports...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-app-light text-slate-900 p-2"
    >
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        {/* HEADER SECTION */}
        <motion.header variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-h2 font-bold text-text-dark">Reports</h1>
            
            <div className="flex items-center text-white py-1 gap-2">
              <p className="text-text-dark text-micro font-medium">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
              
              <span className='text-sm-text text-text-dark/20 font-light'>|</span>
              
              <span className="text-micro font-medium text-text-dark uppercase">
                {currentTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  hour12: true 
                })}
              </span>
            </div>
          </div>
        </motion.header>

        {/* DASHBOARD GRID */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-4 gap-4"
          variants={containerVariants}
        >
          {/* KPI CARDS */}
          <motion.div variants={itemVariants} className="lg:col-span-4">
            <KpiCards range={dateRange} />
          </motion.div>

          {/* SALES PERFORMANCE */}
          <motion.div variants={itemVariants} className="lg:col-span-4">
            <SalesPerformance range={dateRange} />
          </motion.div>

          {/* OPERATIONAL PULSE */}
          <motion.div variants={itemVariants} className="lg:col-span-4">
            <RushPulse range={dateRange} />
          </motion.div>

          {/* BOTTOM ROW */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <CustomerMix range={dateRange} />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-2">
            <TopCustomers range={dateRange} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}