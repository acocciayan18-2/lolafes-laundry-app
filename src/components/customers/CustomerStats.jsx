import React, { useMemo } from "react";

export default function CustomerStats({ customers = [] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDayString = now.toDateString();

    let newThisMonth = 0;
    let newToday = 0;

    customers.forEach((c) => {
      const rawDate = c.created_at || c.created_date;
      if (!rawDate) return;
      
      let cDate;
      if (rawDate.seconds) {
        cDate = rawDate.toDate();
      } else {
        cDate = new Date(rawDate);
      }

      const isSameYear = cDate.getFullYear() === currentYear;
      const isSameMonth = cDate.getMonth() === currentMonth;
      
      if (isSameYear && isSameMonth) {
        newThisMonth++;
      }

      if (cDate.toDateString() === currentDayString) {
        newToday++;
      }
    });

    return { newThisMonth, newToday };
  }, [customers]);

  const StatCard = ({ value, label, colorClass, className }) => (
    <div className={`bg-white border border-slate-200 shadow-sm rounded-xl p-3 py-2 pb-3 text-center transition-all duration-300 ${className}`}>
      {/* VALUE: text-h1 (28px) */}
      <div className={`text-h2 font-bold ${colorClass} leading-tight`}>
        {value.toLocaleString()}
      </div>
      {/* LABEL: text-micro (11px) */}
      <div className="text-micro font-medium text-text-dark/70  mt-1">
        {label}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
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