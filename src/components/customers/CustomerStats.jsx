import React from "react";

export default function CustomerStats({ customers }) {
  const currentMonth = new Date().getMonth();
  const currentDay = new Date().toDateString();

  const newThisMonth = customers.filter(c => c.created_date && new Date(c.created_date).getMonth() === currentMonth).length;
  const newToday = customers.filter(c => c.created_date && new Date(c.created_date).toDateString() === currentDay).length;

  const StatCard = ({ value, label, colorClass, className }) => (
    <div className={`bg-white/80 border border-slate-200 shadow-sm rounded-xl p-3 py-2 pb-3 text-center transition-all duration-300 ${className}`}>
      <div className={`text-2xl font-bold ${colorClass} leading-tight`}>
        {value.toLocaleString()}
      </div>
      <div className="text-[12px]  text-slate-500 font-medium">
        {label}
      </div>
    </div>
  );

  return (
    /* GRID LOGIC:
       - Default: 2 columns (Mobile)
       - md: 3 columns (Tablet/Desktop)
    */
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
      
      {/* 'col-span-2 md:col-span-1' 
          Makes "Total Customers" full width on mobile, 
          but 1/3 width on desktop.
      */}
      <StatCard 
        value={customers.length} 
        label="Total Customers" 
        colorClass="text-[#2d79f3]" 
        className="col-span-2 md:col-span-1"
      />

      <StatCard 
        value={newThisMonth} 
        label="New This Month" 
        colorClass="text-emerald-600" 
        className="col-span-1"
      />

      <StatCard 
        value={newToday} 
        label="New Today" 
        colorClass="text-purple-600" 
        className="col-span-1"
      />
      
    </div>
  );
}