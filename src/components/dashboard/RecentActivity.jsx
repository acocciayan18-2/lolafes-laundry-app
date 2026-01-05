import React from "react";

// --- NATIVE HELPERS (No date-fns needed) ---
const formatTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

// --- EXPLICIT SVG ICONS ---
const IconActivity = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const IconPlus = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 5v14M5 12h14" /></svg>
);

const IconPackage = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m7.5 4.27 9 5.15m-9 5.15 9 5.14m-9-5.14V4.27m9 5.15V19.71m-9-5.14L2.36 12l5.14-2.86m9 5.14L21.64 12l-5.14-2.86" />
  </svg>
);

const IconCheck = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5" /></svg>
);

const IconClock = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);

export default function RecentActivity({ orders = [] }) {
  const activities = [...orders]
    .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))
    .slice(0, 8);

  const getActivityStyle = (type) => {
    switch(type) {
      case 'pending': return { icon: <IconPlus className="w-3.5 h-3.5" />, color: 'text-amber-600 bg-amber-50 border-amber-100', text: 'New order created' };
      case 'in_progress': return { icon: <IconPackage className="w-3.5 h-3.5" />, color: 'text-blue-600 bg-blue-50 border-blue-100', text: 'Order in progress' };
      case 'ready': return { icon: <IconCheck className="w-3.5 h-3.5" />, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', text: 'Ready for pickup' };
      case 'picked_up': return { icon: <IconCheck className="w-3.5 h-3.5" />, color: 'text-slate-600 bg-slate-50 border-slate-100', text: 'Order completed' };
      default: return { icon: <IconClock className="w-3.5 h-3.5" />, color: 'text-slate-500 bg-slate-50 border-slate-100', text: 'Order updated' };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <div className="p-1.5 bg-indigo-50 rounded-lg">
          <IconActivity className="w-5 h-5 text-indigo-600" />
        </div>
        <h2 className="font-bold text-slate-800 text-[16px]">Recent Activity</h2>
      </div>

      {/* List Area */}
      <div className="p-2 flex-1 overflow-y-auto">
        {activities.length > 0 ? (
          <div className="space-y-1">
            {activities.map((order) => {
              const style = getActivityStyle(order.status);
              return (
                <div key={order.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-xl transition-all group">
                  <div className={`w-8 h-8 rounded-full border shrink-0 flex items-center justify-center ${style.color}`}>
                    {style.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 leading-tight">
                      {style.text}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {order.customer_name} • <span className="font-mono">{order.id.split('-')[0]}</span>
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                      {formatTimeAgo(order.updated_date || order.created_date)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-black text-slate-900">
                      ₱{order.total_amount?.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <IconClock className="w-10 h-10 mb-2 opacity-10" />
            <p className="text-sm font-medium">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}