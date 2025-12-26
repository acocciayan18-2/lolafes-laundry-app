import React from 'react';

export default function ReportCards({ title, value, icon: Icon, bgColor, subtitle }) {
  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-r ${bgColor} shadow-md text-white`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}