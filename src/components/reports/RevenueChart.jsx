import React from "react";
import { IconTrendingUp } from "../icons";

export default function RevenueChart({ data, isLoading }) {
  // Calculate max value for scaling the bars
  const maxRevenue = data.length > 0 ? Math.max(...data.map(d => d.revenue)) : 100;

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl shadow-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <IconTrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-gray-900 text-lg">Revenue Trend</h3>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="relative h-64 w-full">
          {/* Chart Area */}
          <div className="absolute inset-0 flex items-end justify-between gap-2 pl-8 pb-6 border-b border-l border-gray-200">
            {/* Y-Axis Labels (Simple) */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-gray-400 w-6">
              <span>{Math.round(maxRevenue / 1000)}k</span>
              <span>0</span>
            </div>

            {/* Bars */}
            {data.map((item, index) => {
              // Calculate height percentage (min 5% for visibility)
              const heightPercent = Math.max((item.revenue / maxRevenue) * 100, 5);
              
              return (
                <div key={index} className="group relative flex-1 flex flex-col justify-end items-center h-full">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none whitespace-nowrap z-10">
                    <p className="font-bold">₱{item.revenue.toFixed(2)}</p>
                    <p className="text-gray-300">{item.orders} orders</p>
                  </div>
                  
                  {/* The Bar */}
                  <div 
                    style={{ height: `${heightPercent}%` }} 
                    className="w-full max-w-[40px] bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm hover:from-blue-600 hover:to-blue-500 transition-all duration-300"
                  ></div>
                  
                  {/* X-Axis Label */}
                  <div className="absolute top-full mt-2 text-[10px] sm:text-xs text-gray-500 text-center w-full truncate">
                    {item.date}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}