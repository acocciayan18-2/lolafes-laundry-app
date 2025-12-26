import React from "react";

export default function CustomerStats({ customers }) {
  const currentMonth = new Date().getMonth();
  const currentDay = new Date().toDateString();

  const newThisMonth = customers.filter(c => c.created_date && new Date(c.created_date).getMonth() === currentMonth).length;
  const newToday = customers.filter(c => c.created_date && new Date(c.created_date).toDateString() === currentDay).length;

  const StatCard = ({ value, label, colorClass }) => (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-100 shadow-md rounded-xl p-4 text-center transform transition-transform hover:-translate-y-1 duration-300">
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-sm text-gray-600 font-medium">{label}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      <StatCard value={customers.length} label="Total Customers" colorClass="text-blue-600" />
      <StatCard value={newThisMonth} label="New This Month" colorClass="text-green-600" />
      <StatCard value={newToday} label="New Today" colorClass="text-purple-600" />
    </div>
  );
}