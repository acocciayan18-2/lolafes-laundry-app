import React, { useMemo } from "react";

// ==========================================
// UTILITY HELPERS
// ==========================================

/**
 * @description Safely parses Firestore Timestamps, ISO strings, or raw integers into a valid JS Date.
 * Returns null if parsing fails, preventing "Invalid Date" crashes downstream.
 * @param {any} rawDate 
 * @returns {Date|null}
 */
const parseSafeDate = (rawDate) => {
  if (!rawDate) return null;
  try {
    if (typeof rawDate.toDate === 'function') return rawDate.toDate();
    if (rawDate.seconds) return new Date(rawDate.seconds * 1000);
    
    const parsed = new Date(rawDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (error) {
    console.error("[CustomerStats] Date parsing error:", error);
    return null;
  }
};

// ==========================================
// ATOMIC COMPONENTS
// ==========================================

/**
 * @component StatCard
 * @description Extracted and memoized presentational component for displaying individual metrics.
 */
const StatCard = React.memo(({ value, label, colorClass, className }) => (
  <article 
    className={`bg-white border border-slate-200 shadow-sm rounded-xl p-3 py-2 pb-3 text-center transition-all duration-300 ${className}`}
    aria-label={`${label}: ${value.toLocaleString()}`}
  >
    {/* A11y: Hide internal visual text nodes from screen readers to prevent duplicate reading */}
    <div className={`text-h2 font-bold ${colorClass} leading-tight`} aria-hidden="true">
      {value.toLocaleString()}
    </div>
    <h3 className="text-micro font-medium text-text-dark/70 mt-1" aria-hidden="true">
      {label}
    </h3>
  </article>
));
StatCard.displayName = "StatCard";

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function CustomerStats({ customers = [] }) {
  // DEFENSIVE GUARD: Ensure customers is strictly an array to prevent fatal crashes
  const safeCustomers = useMemo(() => {
    return Array.isArray(customers) ? customers : [];
  }, [customers]);

  /**
   * ⚠️ ARCHITECTURAL NOTE: FRONTEND VS BACKEND
   * This calculation provides fast UI feedback. However, for true analytical reporting 
   * in an enterprise POS, these metrics MUST be aggregated on the backend 
   * (e.g., via Firestore Count/Aggregation queries or Cloud Functions) 
   * to prevent downloading the entire customer database to the client's device.
   */
  const stats = useMemo(() => {
    if (safeCustomers.length === 0) return { newThisMonth: 0, newToday: 0 };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDayString = now.toDateString();

    return safeCustomers.reduce((acc, c) => {
      if (!c || typeof c !== 'object') return acc;

      const cDate = parseSafeDate(c.created_at || c.created_date);
      if (!cDate) return acc;

      if (cDate.getFullYear() === currentYear && cDate.getMonth() === currentMonth) {
        acc.newThisMonth++;
      }

      if (cDate.toDateString() === currentDayString) {
        acc.newToday++;
      }

      return acc;
    }, { newThisMonth: 0, newToday: 0 });

  }, [safeCustomers]);

  // --- RENDER ---
  return (
    <section 
      className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3" 
      aria-label="Customer Growth Statistics"
    >
      <StatCard 
        value={safeCustomers.length} 
        label="Total Customers" 
        colorClass="text-[#2d79f3]" 
        className="col-span-2 md:col-span-1"
      />

      <StatCard 
        value={stats.newThisMonth} 
        label="New This Month" 
        colorClass="text-emerald-600" 
        className="col-span-1"
      />

      <StatCard 
        value={stats.newToday} 
        label="New Today" 
        colorClass="text-purple-600" 
        className="col-span-1"
      />
    </section>
  );
}