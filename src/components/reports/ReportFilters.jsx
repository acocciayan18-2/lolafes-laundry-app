import React from "react";
import { IconCalendar, IconRefreshCw } from "../icons";

const dateRangeOptions = [
  { value: "1", label: "Today" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 3 Months" }
];

export default function ReportFilters({ dateRange, setDateRange, isLoading }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-8 rounded-xl p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <IconCalendar className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">Time Period:</span>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {dateRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              disabled={isLoading}
              className={`inline-flex items-center justify-center rounded-lg text-sm font-medium px-4 py-2 transition-all duration-200 ${
                dateRange === option.value
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-blue-50"
              }`}
            >
              {isLoading && dateRange === option.value && (
                <IconRefreshCw className="w-3 h-3 mr-1 animate-spin" />
              )}
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}