import React from 'react';
import { Link } from 'react-router-dom';
import { IconPlus, IconUsers } from '../icons'; // Adjust import path as needed

export default function QuickActions() {
  const baseBtnClass = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2";
  
  return (
    <div className="flex gap-3">
      <Link to="/main/neworder">
        <button className={`${baseBtnClass} bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg`}>
          <IconPlus className="w-5 h-5 mr-2" />
          New Order
        </button>
      </Link>
      <Link to="/main/customers">
        <button className={`${baseBtnClass} border border-gray-200 bg-white hover:bg-blue-50 hover:text-blue-600 text-gray-700`}>
          <IconUsers className="w-5 h-5 mr-2" />
          Customers
        </button>
      </Link>
    </div>
  );
}