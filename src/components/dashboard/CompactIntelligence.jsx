import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "../../store/orders/useOrderStore";

export default function CompactIntelligence() {
  const metrics = useOrderStore((state) => state.metrics);
  const [index, setIndex] = useState(0);
  
  // 1. ADDED UX FUNCTIONALITY: Pause the ticker if the user is hovering to read it
  const [isPaused, setIsPaused] = useState(false);

  // 2. DATA SECURITY & VALIDATION: Memoized with Fallbacks
  const slides = useMemo(() => {
    // Safely destructure with default values so the app never crashes if metrics are null/undefined
    const {
      salesToday = 0,
      salesYesterdayTotal = 0,
      ordersTodayCount = 0,
      ordersYesterdayTotalCount = 0,
      revenueAtRisk = 0,
      avgVelocity = "N/A",
      staleOrders = []
    } = metrics || {};

    const salesPercent = salesYesterdayTotal > 0 
        ? ((salesToday / salesYesterdayTotal) * 100).toFixed(1) : 0;
    
    const ordersPercent = ordersYesterdayTotalCount > 0 
        ? ((ordersTodayCount / ordersYesterdayTotalCount) * 100).toFixed(1) : 0;

    const baseSlides = [
      { 
        label: "Sales Progress", 
        val: `${salesPercent}%`, 
        // Number() ensures safe formatting even if a string slips through
        sub: `Today's revenue is ₱${Number(salesToday).toLocaleString()} vs yesterday's ₱${Number(salesYesterdayTotal).toLocaleString()}`, 
      },
      { 
        label: "Order Pacing", 
        val: `${ordersPercent}%`, 
        sub: `${ordersTodayCount} orders today vs ${ordersYesterdayTotalCount} yesterday`, 
      },
      { 
        label: "Financial Risk", 
        val: `₱${Number(revenueAtRisk).toLocaleString()}`, 
        sub: `Unpaid orders waiting to be collected`, 
      },
      { 
        label: "Shop Speed", 
        val: avgVelocity || "N/A", 
        sub: `Average time to finish laundry today`, 
      },
    ];

    const staleSlides = staleOrders.map(order => ({
      label: "Action Needed",
      val: `#${order.order_number || "Unknown"}`,
      sub: `${order.customer_name || "Customer"}'s order is stuck in "${(order.status || "").replace('_', ' ')}"`,
      pulse: true
    }));

    return [...staleSlides, ...baseSlides];
  }, [metrics]);

  // 3. ERROR HANDLING: Reset index safely if the data length suddenly shrinks
  useEffect(() => {
    if (slides.length > 0 && index >= slides.length) {
      setIndex(0);
    }
  }, [slides.length, index]);

  // 4. PERFORMANCE: Optimized Interval Logic
  useEffect(() => {
    if (slides.length === 0 || isPaused) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length, isPaused]); // Removed 'index' from dependency array to stop constant re-renders

  const current = slides[index];
  if (!current) return null;

  return (
    <div 
      className="flex items-center overflow-hidden px-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          // Added the 'index' to the key to guarantee the animation fires even if two identical values sit back-to-back
          key={`${current.label}-${current.val}-${index}`} 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0 ">
            <div className="flex items-center gap-2">
              
              <span className={`text-nano uppercase whitespace-nowrap 
                ${current.pulse ? 'text-text-dark animate-pulse' : 'text-text-dark/50'}`}>
                {current.label}:
              </span>
              
              <span className="text-sm-text font-bold whitespace-nowrap text-text-dark">
                {current.val}
              </span>
            </div>
            
            <span className="text-micro text-text-dark/70 italic truncate sm:pl-3 border-l border-transparent sm:border-gray-200">
               {current.sub}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}