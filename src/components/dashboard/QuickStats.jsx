import React from 'react';

export default function QuickStats({ title, value, icon, bgColor, trend }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl border-0 transition-all duration-300 transform hover:-translate-y-1">
      <div className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
            {trend && <p className="text-xs text-gray-500 mt-2">{trend}</p>}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-r ${bgColor} shadow-lg text-white`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}