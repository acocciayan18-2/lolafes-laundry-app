import React from "react";

// Native JS helpers to replace date-fns
const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const getYesterdayStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Explicit SVG Icons for Trends
const IconTrendingUp = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconTrendingDown = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

const IconMinus = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function ComparisonCards({ orders = [] }) {
  const todayTime = getStartOfDay(new Date());
  const yesterdayTime = getYesterdayStart();

  // Filter orders using timestamp comparison
  const todayOrders = orders.filter(order => 
    getStartOfDay(order.created_date) === todayTime
  );
  const yesterdayOrders = orders.filter(order => 
    getStartOfDay(order.created_date) === yesterdayTime
  );

  const todayRevenue = todayOrders.filter(o => o.is_paid).reduce((sum, o) => sum + o.total_amount, 0);
  const yesterdayRevenue = yesterdayOrders.filter(o => o.is_paid).reduce((sum, o) => sum + o.total_amount, 0);

  const revenueChange = yesterdayRevenue > 0 
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
    : todayRevenue > 0 ? 100 : 0;

  const orderChange = yesterdayOrders.length > 0
    ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length * 100).toFixed(1)
    : todayOrders.length > 0 ? 100 : 0;

  const getTrendIcon = (change) => {
    if (change > 0) return <IconTrendingUp className="w-4 h-4" />;
    if (change < 0) return <IconTrendingDown className="w-4 h-4" />;
    return <IconMinus className="w-4 h-4" />;
  };

  const getTrendColor = (change) => {
    if (change > 0) return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (change < 0) return 'text-red-700 bg-red-100 border-red-200';
    return 'text-slate-600 bg-slate-100 border-slate-200';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Revenue Comparison Card */}
      <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl shadow-sm p-6 transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[11px] font-bold text-emerald-700 ">Today vs Yesterday</p>
            <p className="text-3xl font-black text-slate-900 mt-1">₱{todayRevenue.toLocaleString()}</p>
          </div>
          <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${getTrendColor(revenueChange)}`}>
            {getTrendIcon(revenueChange)}
            <span className="text-xs font-bold">{Math.abs(revenueChange)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="h-1 w-full bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(Math.max(Math.abs(revenueChange), 5), 100)}%` }}></div>
           </div>
           <p className="text-[10px] font-medium text-slate-400 whitespace-nowrap">Yesterday: ₱{yesterdayRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Order Volume Card */}
      <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl shadow-sm p-6 transition-all hover:shadow-md">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[11px] font-bold text-blue-700 ">Order Volume</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{todayOrders.length} <span className="text-lg font-bold text-slate-400">Orders</span></p>
          </div>
          <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${getTrendColor(orderChange)}`}>
            {getTrendIcon(orderChange)}
            <span className="text-xs font-bold">{Math.abs(orderChange)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="h-1 w-full bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${Math.min(Math.max(Math.abs(orderChange), 5), 100)}%` }}></div>
           </div>
           <p className="text-[10px] font-medium text-slate-400 whitespace-nowrap">Yesterday: {yesterdayOrders.length}</p>
        </div>
      </div>
    </div>
  );
}