import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useReportStore } from "../store/reports/useReportStore";
<<<<<<< HEAD
=======
import ExportOrdersButton from "../components/reports/ExportOrdersButton";
>>>>>>> Karen2.0

// Component Imports
import CustomerMix from "../components/reports/CustomerMix";
import KpiCards from "../components/reports/KpiCards";
import RushPulse from "../components/reports/RushPulse";
import SalesPerformance from "../components/reports/SalesPerformance";
import TopCustomers from "../components/reports/TopCustomers";
import { ReportsSkeleton } from "../components/skeleton-loader";

<<<<<<< HEAD
//TOUR
import { useLocation, useNavigate } from 'react-router-dom';
import { startGlobalTour } from '../tours/globalTours';


=======
>>>>>>> Karen2.0
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
<<<<<<< HEAD
  const location = useLocation();
  const navigate = useNavigate();


=======
>>>>>>> Karen2.0
  const { subscribeToReports, isLoading } = useReportStore();
  
  const [dateRange] = useState("7"); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // NEW: State to control delayed skeleton visibility
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

<<<<<<< HEAD
//Tour Logic 
useEffect(() => {
  const searchParams = new URLSearchParams(location.search);
  const isTourActive = searchParams.get('tour') === 'active';
  
  // Also check if the store is still loading
  if (isTourActive && !isLoading) {
    // INCREASE the timeout. 400ms is often too fast for 
    // Framer Motion + Firebase data fetching.
    const timer = setTimeout(() => {
      console.log("Tour Triggered!"); // Check your console to see if this fires
      startGlobalTour(navigate);
    }, 1200); 

    return () => clearTimeout(timer);
  }
}, [location.search, isLoading]); // Added isLoading as a dependency
  

=======
>>>>>>> Karen2.0
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
<<<<<<< HEAD
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

=======
       <motion.header 
  variants={itemVariants} 
  className="flex flex-row justify-between items-center mb-6 px-1"
>
  {/* LEFT SIDE: Title & Clock */}
  <div className="flex flex-col">
    <h1 className="text-h2 font-bold text-text-dark leading-tight">Reports</h1>
    
    <div className="flex items-center gap-2 mt-0.5">
      <p className="text-text-dark text-micro font-medium whitespace-nowrap">
        {currentTime.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })}
      </p>
      
      <span className='text-sm-text text-text-dark/20 font-light select-none'>|</span>
      
      <span className="text-micro font-medium text-text-dark uppercase whitespace-nowrap">
        {currentTime.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        })}
      </span>
    </div>
  </div>

  {/* RIGHT SIDE: Export Button */}
  <div className="shrink-0">
    <ExportOrdersButton />
  </div>
</motion.header>
>>>>>>> Karen2.0
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-4 gap-4"
          variants={containerVariants}
        >
<<<<<<< HEAD
          <motion.div id="step-reports-kpi"  variants={itemVariants} className="lg:col-span-4">
=======
          <motion.div variants={itemVariants} className="lg:col-span-4">
>>>>>>> Karen2.0
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

<<<<<<< HEAD
          <motion.div id="step-reports-top" variants={itemVariants} className="lg:col-span-2">
=======
          <motion.div variants={itemVariants} className="lg:col-span-2">
>>>>>>> Karen2.0
            <TopCustomers range={dateRange} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}