import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "../../store/orders/useOrderStore";

export default function CompactIntelligence() {
  const metrics = useOrderStore((state) => state.metrics);
  const [index, setIndex] = useState(0);

  const slides = useMemo(() => {
    const salesPercent = metrics.salesYesterdayTotal > 0 
        ? ((metrics.salesToday / metrics.salesYesterdayTotal) * 100).toFixed(1) : 0;
    
    const ordersPercent = metrics.ordersYesterdayTotalCount > 0 
        ? ((metrics.ordersTodayCount / metrics.ordersYesterdayTotalCount) * 100).toFixed(1) : 0;

    const baseSlides = [
      { 
        label: "Sales Progress", 
        val: `${salesPercent}%`, 
        sub: `Today's revenue is ₱${metrics.salesToday.toLocaleString()} vs yesterday's ₱${metrics.salesYesterdayTotal.toLocaleString()}`, 
      },
      { 
        label: "Order Pacing", 
        val: `${ordersPercent}%`, 
        sub: `${metrics.ordersTodayCount} orders today vs ${metrics.ordersYesterdayTotalCount} yesterday`, 
      },
      { 
        label: "Financial Risk", 
        val: `₱${metrics.revenueAtRisk.toLocaleString()}`, 
        sub: `Unpaid orders waiting to be collected`, 
      },
      { 
        label: "Shop Speed", 
        val: metrics.avgVelocity, 
        sub: `Average time to finish laundry today`, 
      },
    ];

    const staleSlides = (metrics.staleOrders || []).map(order => ({
      label: "Action Needed",
      val: `#${order.order_number}`,
      sub: `${order.customer_name}'s order is stuck in "${order.status.replace('_', ' ')}"`,
      pulse: true
    }));

    return [...staleSlides, ...baseSlides];
  }, [metrics]);

  useEffect(() => {
    if (slides.length === 0) return;
    if (index >= slides.length) setIndex(0);

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length, index]);

  const current = slides[index];
  if (!current) return null;

  return (
    <div className="flex items-center overflow-hidden px-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.label}-${current.val}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0 ">
            <div className="flex items-center gap-2">
              
              {/* LABEL: Applied 'text-nano' for the tiny uppercase overline look */}
              <span className={`text-nano uppercase whitespace-nowrap 
                ${current.pulse ? 'text-text-dark animate-pulse' : 'text-text-dark/50'}`}>
                {current.label}:
              </span>
              
              {/* VALUE: Applied 'text-sm-text' with font-bold for primary focus */}
              <span className="text-sm-text font-bold whitespace-nowrap text-text-dark">
                {current.val}
              </span>
            </div>
            
            {/* SUBTEXT: Applied 'text-micro' for metadata styling */}
            <span className="text-micro text-text-dark/70 italic truncate sm:pl-3 border-l border-transparent sm:border-gray-200">
               {current.sub}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}