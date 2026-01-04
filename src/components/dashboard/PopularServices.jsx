import React from "react";

// Explicit SVG Icons
const IconTrending = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const IconGrowth = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

// --- MOCK SERVICES DATA ---
// You can use this inside your Dashboard.jsx or as a default prop
export const MOCK_ORDER_SERVICES = [
  {
    id: "ORD-001",
    services: [
      { service_name: "Wash & Dry", weight_kg: 7.5, total_price: 225 },
      { service_name: "Comforter", weight_kg: 4.0, total_price: 350 }
    ]
  },
  {
    id: "ORD-002",
    services: [
      { service_name: "Wash & Dry", weight_kg: 5.0, total_price: 150 }
    ]
  },
  {
    id: "ORD-003",
    services: [
      { service_name: "Dry Only", weight_kg: 8.0, total_price: 120 },
      { service_name: "Wash & Dry", weight_kg: 6.5, total_price: 195 }
    ]
  },
  {
    id: "ORD-004",
    services: [
      { service_name: "Press Only", weight_kg: 2.0, total_price: 100 }
    ]
  }
];

export default function PopularServices({ orders = MOCK_ORDER_SERVICES }) {
  const serviceStats = {};
  
  // Aggregate data from orders
  orders.forEach(order => {
    if (order.services && Array.isArray(order.services)) {
      order.services.forEach(service => {
        const name = service.service_name;
        if (!serviceStats[name]) {
          serviceStats[name] = { count: 0, revenue: 0, weight: 0 };
        }
        serviceStats[name].count += 1;
        serviceStats[name].revenue += service.total_price || (service.price_per_kg * service.weight_kg) || 0;
        serviceStats[name].weight += service.weight_kg || 0;
      });
    }
  });

  const topServices = Object.entries(serviceStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-white">
        <div className="p-1.5 bg-emerald-100 rounded-lg">
          <IconTrending className="w-5 h-5 text-emerald-600" />
        </div>
        <h2 className="font-bold text-slate-800 text-[16px]">Popular Services</h2>
      </div>

      {/* Content Area */}
      <div className="p-3 space-y-3 flex-1">
        {topServices.length > 0 ? (
          topServices.map(([serviceName, stats], index) => (
            <div 
              key={serviceName} 
              className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl  hover:border-emerald-200 transition-all duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Rank Badge */}
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-white font-black text-[10px]">#{index + 1}</span>
                </div>
                
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-[14px] truncate leading-tight">
                    {serviceName}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {stats.weight.toFixed(1)} kg total weight
                  </p>
                </div>
              </div>

              {/* Stats Section */}
              <div className="text-right shrink-0 ml-2">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-tight">
                    {stats.count} orders
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <IconGrowth className="w-3 h-3 text-emerald-500" />
                  <p className="text-[14px] font-bold text-slate-900">
                    ₱{stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <IconTrending className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm font-medium">Waiting for order data...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-slate-50/30 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 text-center font-medium uppercase tracking-widest">
          Based on last 30 days
        </p>
      </div>
    </div>
  );
}