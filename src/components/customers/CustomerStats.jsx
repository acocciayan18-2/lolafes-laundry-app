import React, { useMemo } from "react";

export default function CustomerStats({ customers = [] }) {
  // useMemo ensures we only recalculate when 'customers' changes
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDayString = now.toDateString();

    let newThisMonth = 0;
    let newToday = 0;

    customers.forEach((c) => {
      if (!c.created_date) return;
      
      const cDate = new Date(c.created_date);

      // FIX: Check both Year and Month
      const isSameYear = cDate.getFullYear() === currentYear;
      const isSameMonth = cDate.getMonth() === currentMonth;
      
      if (isSameYear && isSameMonth) {
        newThisMonth++;
      }

      // Check Today
      if (cDate.toDateString() === currentDayString) {
        newToday++;
      }
    });

    return { newThisMonth, newToday };
  }, [customers]);

  const StatCard = ({ value, label, colorClass, className }) => (
    <div className={`bg-white/80 border border-slate-200 shadow-sm rounded-xl p-3 py-2 pb-3 text-center transition-all duration-300 ${className}`}>
      <div className={`text-2xl font-bold ${colorClass} leading-tight`}>
        {value.toLocaleString()}
      </div>
      <div className="text-[12px] text-slate-500 font-medium">
        {label}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
      {/* Total Customers - Full width on mobile, 1/3 on desktop */}
      <StatCard 
        value={customers.length} 
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
    </div>
  );
}