import React from "react";
import { IconPhone, IconMapPin } from "../icons";

export default function CustomerCard({ customer }) {
  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar Placeholder */}
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <span className="text-white font-bold text-lg">
              {(customer.name || "U").charAt(0).toUpperCase()}
            </span>
          </div>
          
          {/* Details */}
          <div>
            <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 mt-1">
              <div className="flex items-center gap-1">
                <IconPhone className="w-4 h-4 text-gray-400" />
                <span>{customer.phone}</span>
              </div>
              {customer.address && (
                <div className="flex items-center gap-1">
                  <IconMapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate max-w-[200px]">{customer.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* You can add action buttons here later (Edit/Delete) */}
      </div>
    </div>
  );
}