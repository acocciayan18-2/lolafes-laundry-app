import React from "react";

// Explicit SVG Icons to avoid import errors
const IconUser = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconBag = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export default function RecentCustomers({ customers = [] }) {
  // Sort and Slice logic
  const recentCustomers = [...customers]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Explicit Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-white">
        <div className="p-1.5 bg-purple-100 rounded-lg">
          <IconUser className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="font-bold text-slate-800 text-[16px]">Recent Customers</h2>
      </div>

      {/* Content Area */}
      <div className="p-3 space-y-3 flex-1">
        {recentCustomers.length > 0 ? (
          recentCustomers.map((customer) => (
            <div 
              key={customer.id} 
              className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl transition-all hover:bg-slate-50 hover:border-slate-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-white font-bold text-sm">
                    {customer.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                {/* Info */}
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-[14px] truncate leading-tight">
                    {customer.name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {customer.phone}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="text-right shrink-0 ml-2">
                <div className="flex items-center justify-end gap-1 text-purple-600">
                  <IconBag className="w-3.5 h-3.5" />
                  <span className="font-bold text-[14px]">{customer.total_orders || 0}</span>
                </div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">orders</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <IconUser className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm font-medium">No customers yet</p>
          </div>
        )}
      </div>
      
      
    </div>
  );
}