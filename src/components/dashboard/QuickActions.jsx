import React from 'react';
import { Link } from 'react-router-dom';
import { IconPlus, IconUsers } from '../icons'; 

export default function QuickActions() {
  // We use h-9 and flex items-center to match the height 
  // and vertical alignment of your Dashboard header.
  const commonBtnClass = "h-9 px-4 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-md focus:outline-none active:scale-95";

  return (
    <div className="flex items-center gap-3">
      {/* 1. NEW ORDER BUTTON */}
      <Link to="/main/neworder">
        <button className={`${commonBtnClass} bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white`}>
          <IconPlus className="w-4 h-4 !text-white !stroke-white" />
          <span className='text-sm font-medium text-white'>New Order</span>
        </button>
      </Link>

      {/* 2. CUSTOMERS BUTTON */}
      <Link to="/main/customers">
        <button className={`${commonBtnClass} bg-white border border-gray-200 text-slate-700 hover:bg-gray-50`}>
          <IconUsers className="w-4 h-4 text-slate-400" />
          <span className='text-sm font-medium text-gray-700'>Customers</span>
        </button>
      </Link>
    </div>
  );
}