import React from 'react';
import { Link } from 'react-router-dom';
import { IconPlus, IconUsers } from '../icons'; 

export default function QuickActions() {
  // Shared structural classes (Shape, Size, Shadow, Font)
  // We extract this to ensure BOTH buttons are identical in size/feel
  const commonBtnClass = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none shadow-md px-4 py-3 h-9 text-sm";

  return (
    <div className="flex gap-3">
      {/* Button 1: New Order (Primary - Blue Gradient) */}
      <Link to="/main/neworder">
        <button className={`${commonBtnClass} bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white`}>
          <IconPlus className="w-4 h-4 mr-2 !text-white !stroke-white" />
          New Order
        </button>
      </Link>

      {/* Button 2: Customers (Secondary - White/Gray) */}
      {/* Uses the exact same commonBtnClass for structure, only color differs */}
      <Link to="/main/customers">
        <button className={`${commonBtnClass} bg-white border border-gray-200 text-slate-700 hover:bg-gray-50`}>
          <IconUsers className="w-4 h-4 mr-2 text-slate-700" />
          Customers
        </button>
      </Link>
    </div>
  );
}