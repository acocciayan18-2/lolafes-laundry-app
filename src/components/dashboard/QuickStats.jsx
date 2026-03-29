import React from 'react';

/**
 * @component QuickStats
 * @description Enhanced KPI card with dynamic theming and safe prop parsing.
 */
export default function QuickStats({ 
  title = "Metric", 
  value = "-", 
  icon = null, 
  trend = "",
  iconClass = "text-text-dark stroke-text-dark", // Default color
  
}) {
  // Defensive Parsing
  const safeTitle = String(title || "Metric");
  const safeValue = value ?? "-";
  const safeTrend = String(trend || "");

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 hover:shadow-lg overflow-hidden h-full">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* KPI Label */}
            <p className="text-micro   text-text-dark/70 mb-1 pb-0.5 truncate ">
              {safeTitle}
            </p>
            
            {/* KPI Value */}
            <p 
              className="text-h1 font-bold text-text-dark leading-tight pb-1 truncate tracking-tighter"
              title={String(safeValue)} 
            >
              {safeValue}
            </p>
            
            {/* KPI Footer / Trend */}
            {safeTrend && (
              <p className="text-micro   text-text-dark/60 mt-2 pb-0.5 truncate">
                {safeTrend}
              </p>
            )}
          </div>
          
          {/* Icon Section with Dynamic Theming */}
          {icon && (
            <div 
              className="p-2 md:p-2.5 rounded-lg border shadow-hollow shrink-0 transition-colors"
              aria-hidden="true"
            >
              {React.isValidElement(icon) 
                ? React.cloneElement(icon, { 
                    // ✨ FIX: We now merge the sizing classes with the custom color classes
                    className: `w-4 h-4 md:w-5 md:h-5 ${iconClass} ${icon.props.className || ''}`.trim()
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