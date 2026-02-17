import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useReportStore } from "../store/reports/useReportStore";

// Component Imports
import CustomerMix from "../components/reports/CustomerMix";
import KpiCards from "../components/reports/KpiCards";
import RushPulse from "../components/reports/RushPulse";
import SalesPerformance from "../components/reports/SalesPerformance";
import TopCustomers from "../components/reports/TopCustomers";
import { ReportsSkeleton } from "../components/skeleton-loader";

//TOUR
import { useLocation, useNavigate } from 'react-router-dom';
import { startGlobalTour } from '../tours/globalTours';


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
  const location = useLocation();
  const navigate = useNavigate();


  const { subscribeToReports, isLoading } = useReportStore();
  
  const [dateRange] = useState("7"); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // NEW: State to control delayed skeleton visibility
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

//Tour Logic 
    useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('tour') === 'active' && !isLoading) {
      const timer = setTimeout(() => {
        // Dash: 0 | Orders: 6 | Cust: 8 | Serv: 10 | Rep: 12
        startGlobalTour(navigate, null, 17); 
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.search, isLoading, navigate]);
  

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const unsubscribe = subscribeToReports();
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [subscribeToReports]);

  // NEW: SKELETON DELAY LOGIC (500ms)
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        setShouldShowSkeleton(true);
      }, 500);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // --- RENDERING LOGIC ---

  // Show skeleton only after 0.5s of loading
  if (isLoading && shouldShowSkeleton) {
    return <ReportsSkeleton />;
  }

  // Prevents flicker on fast connections
  if (isLoading && !shouldShowSkeleton) {
    return null;
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-app-light text-slate-900 p-2"
    >
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        <motion.header variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 ">
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

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-4 gap-4"
          variants={containerVariants}
        >
          <motion.div id="step-reports-kpi"  variants={itemVariants} className="lg:col-span-4">
            <KpiCards range={dateRange} />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-4">
            <SalesPerformance range={dateRange} />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-4">
            <RushPulse range={dateRange} />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-2">
            <CustomerMix range={dateRange} />
          </motion.div>

          <motion.div id="step-reports-top" variants={itemVariants} className="lg:col-span-2">
            <TopCustomers range={dateRange} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}