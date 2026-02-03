import React from 'react';

export default function QuickStats({ title, value, icon, trend }) {
  // We ignore the incoming 'bgColor' prop from the parent to enforce our B&W theme
  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10  transform  overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 ">
          <div className="min-w-0 flex-1">
            
            {/* TITLE: Using text-nano (mobile) and text-micro (desktop) */}
            <p className="text-nano md:text-micro font-bold  mb-1 truncate uppercase ">
              {title}
            </p>
            
            {/* VALUE: Using text-h2 (mobile) and text-h1 (desktop) for maximum impact */}
            <p 
              className="text-h2 md:text-h1 font-bold text-text-dark leading-none truncate tracking-tighter"
              title={value} 
            >
              {value}
            </p>
            
            {/* TREND: Using text-nano (mobile) and text-micro (desktop) */}
            {trend && (
              <p className="text-micro font-medium text-text-dark/70 mt-2 truncate ">
                {trend}
              </p>
            )}
          </div>
          
          {/* ICON CONTAINER: Styled with hollow shadow and text-dark stroke */}
          <div className="p-2 md:p-2.5 rounded-lg bg-transparent border shadow-hollow shrink-0">
            {React.isValidElement(icon) 
              ? React.cloneElement(icon, { 
                  className: "w-4 h-4 md:w-5 md:h-5 text-text-dark stroke-text-dark" 
                }) 
              : icon
            }
          </div>
        </div>
      </div>
    </div>
  );
}