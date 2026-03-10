import React from 'react';

export default function QuickStats({ 
  title = "Metric", 
  value = "-", 
  icon = null, 
  trend = "" 
}) {
  const safeTitle = typeof title === 'string' || typeof title === 'number' ? title : "Metric";
  const safeValue = typeof value === 'string' || typeof value === 'number' ? value : "-";
  const safeTrend = typeof trend === 'string' || typeof trend === 'number' ? trend : "";

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transform overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            
            <p className="text-nano md:text-micro font-bold text-text-dark/70 mb-1 truncate uppercase">
              {safeTitle}
            </p>
            
            <p 
              className="text-h2 md:text-h1 font-bold text-text-dark leading-none truncate tracking-tighter"
              title={String(safeValue)} 
            >
              {safeValue}
            </p>
            
            {safeTrend && (
              <p className="text-nano md:text-micro font-medium text-text-dark/60 mt-2 truncate">
                {safeTrend}
              </p>
            )}
          </div>
          
          {icon && (
            <div 
              className="p-2 md:p-2.5 rounded-lg bg-transparent border shadow-hollow shrink-0"
              aria-hidden="true"
            >
              {React.isValidElement(icon) 
                ? React.cloneElement(icon, { 
                    className: "w-4 h-4 md:w-5 md:h-5 text-text-dark stroke-text-dark" 
                  }) 
                : icon
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}