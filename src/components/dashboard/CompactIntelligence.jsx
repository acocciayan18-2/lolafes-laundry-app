import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "../../store/orders/useOrderStore";

export default function CompactIntelligence() {
  const metrics = useOrderStore((state) => state.metrics);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // ==========================================
  // DATA SECURITY: Defensive parsing and default fallbacks
  // ==========================================
  const slides = useMemo(() => {
    // Safely destructure with robust defaults to prevent undefined reference crashes
    const {
      salesToday = 0,
      salesYesterdayTotal = 0,
      ordersTodayCount = 0,
      ordersYesterdayTotalCount = 0,
      revenueAtRisk = 0,
      avgVelocity = "N/A",
      staleOrders = []
    } = metrics || {};

    // Defensively parse floats to ensure math doesn't result in NaN if a string is passed
    const parsedSalesToday = parseFloat(salesToday) || 0;
    const parsedSalesYesterday = parseFloat(salesYesterdayTotal) || 0;
    const parsedOrdersToday = parseFloat(ordersTodayCount) || 0;
    const parsedOrdersYesterday = parseFloat(ordersYesterdayTotalCount) || 0;
    const parsedRisk = parseFloat(revenueAtRisk) || 0;

    const salesPercent = parsedSalesYesterday > 0 
        ? ((parsedSalesToday / parsedSalesYesterday) * 100).toFixed(1) : "0.0";
    
    const ordersPercent = parsedOrdersYesterday > 0 
        ? ((parsedOrdersToday / parsedOrdersYesterday) * 100).toFixed(1) : "0.0";

    const baseSlides = [
      { 
        label: "Sales Progress", 
        val: `${salesPercent}%`, 
        sub: `Today's revenue is ₱${parsedSalesToday.toLocaleString()} vs yesterday's ₱${parsedSalesYesterday.toLocaleString()}`, 
      },
      { 
        label: "Order Pacing", 
        val: `${ordersPercent}%`, 
        sub: `${parsedOrdersToday} orders today vs ${parsedOrdersYesterday} yesterday`, 
      },
      { 
        label: "Financial Risk", 
        val: `₱${parsedRisk.toLocaleString()}`, 
        sub: `Unpaid orders waiting to be collected`, 
      },
      { 
        label: "Shop Speed", 
        val: String(avgVelocity || "N/A"), 
        sub: `Average time to finish laundry today`, 
      },
    ];

    // Array guarding: Ensure staleOrders is iterable before mapping
    const safeStaleOrders = Array.isArray(staleOrders) ? staleOrders : [];
    
    const staleSlides = safeStaleOrders.map(order => {
      // Safe object access
      const orderNumber = order?.order_number || "Unknown";
      const customerName = order?.customer_name || "Customer";
      const status = (order?.status || "Processing").replace('_', ' ');

      return {
        label: "Action Needed",
        val: `#${orderNumber}`,
        sub: `${customerName}'s order is stuck in "${status}"`,
        pulse: true
      };
    });

    return [...staleSlides, ...baseSlides];
  }, [metrics]);

  // ==========================================
  // PERFORMANCE & ERROR HANDLING: Safe Indexing
  // ==========================================
  useEffect(() => {
    // If the data payload shrinks (e.g. stale orders resolved), reset safely to prevent Out of Bounds errors
    if (slides.length > 0 && index >= slides.length) {
      setIndex(0);
    }
  }, [slides.length, index]);

  useEffect(() => {
    if (slides.length === 0 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, isPaused]);

  const current = slides[index];
  if (!current) return null;

  return (
    <div 
      className="flex items-center overflow-hidden px-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="marquee"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.label}-${current.val}-${index}`} 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0 ">
            <div className="flex items-center gap-2">
              <span className={`text-nano uppercase whitespace-nowrap ${current.pulse ? 'text-text-dark animate-pulse' : 'text-text-dark/50'}`}>
                {current.label}:
              </span>
              
              <span className="text-sm-text font-bold whitespace-nowrap text-text-dark">
                {current.val}
              </span>
            </div>
            
            <span className="text-micro text-text-dark/70 italic truncate sm:pl-3 border-l pb-1 border-transparent sm:border-gray-200">
               {current.sub}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}