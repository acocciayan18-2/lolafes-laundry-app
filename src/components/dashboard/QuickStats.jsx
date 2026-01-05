import React from 'react';

 export default function QuickStats({ title, value, icon, bgColor, trend }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
      {/* Reduced padding on mobile (p-3) to fit 2x2 layout better */}
      <div className="p-3 md:p-5">
        <div className="flex items-start justify-between gap-1 md:gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] md:text-[11px] font-bold text-gray-500 mb-1 truncate  tracking-tight">
              {title}
            </p>
            
            <p 
              className="text-xl md:text-3xl font-bold text-slate-900 leading-none truncate"
              title={value} 
            >
              {value}
            </p>
            
            {trend && (
              <p className="text-[9px] md:text-[11px] font-medium text-gray-500 mt-2 truncate">
                {trend}
              </p>
            )}
          </div>
          
          {/* Smaller Icon Container for mobile */}
          <div className={`p-2 md:p-2.5 rounded-lg bg-gradient-to-br ${bgColor} shadow-sm text-white shrink-0`}>
            {React.isValidElement(icon) 
              ? React.cloneElement(icon, { className: "w-4 h-4 md:w-5 md:h-5 text-white stroke-white" }) 
              : icon
            }
          </div>
        </div>
      </div>
    </div>
  );
}
