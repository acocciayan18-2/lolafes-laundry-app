import React from "react";
import { IconPhone, IconMapPin } from "../icons";

export default function CustomerCard({ customer }) {
  return (
    /* Removed translate-y, hover shadow, and reduced padding to p-4 */
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm mb-1">
      <div className="flex items-center gap-4">
        
        {/* Compact Avatar - Using Brand Blue #2d79f3 */}
        <div className="w-10 h-10 bg-gradient-to-r border border-slate-100 rounded-xl flex items-center from-blue-500 to-indigo-600 justify-center shrink-0">
          <span className="text-white font-medium text-base">
            {(customer.name || "U").charAt(0).toUpperCase()}
          </span>
        </div>
        
        {/* Details Section */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold uppercase text-slate-900 leading-none mb-1.5 truncate">
            {customer.name}
          </h3>
          
          <div className="flex flex-wrap items-center gap-y-1 gap-x-3">
            {/* Phone Number */}
            <div className="flex items-center gap-1.5 text-slate-500">
              <IconPhone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-medium">{customer.phone}</span>
            </div>

            {/* Vertical Separator for desktop */}
            {customer.address && (
              <div className="hidden sm:block w-px h-3 bg-slate-200" />
            )}

            {/* Address */}
            {customer.address && (
              <div className="flex items-center gap-1.5 text-slate-500 min-w-0 flex-1 sm:flex-none">
                <IconMapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-medium truncate">
                  {customer.address}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action area - Placeholder for future Edit/Delete buttons */}
        <div className="flex items-center">
           {/* Add buttons here if needed */}
        </div>
      </div>
    </div>
  );
}