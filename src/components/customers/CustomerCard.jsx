import React from "react";
import { IconPhone, IconMapPin } from "../icons";

const CustomerCard = ({ customer }) => {
  const firstLetter = customer.name ? customer.name.charAt(0).toUpperCase() : "?";

  return (
    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-4">
        
        {/* LEFT: Avatar Icon */}
        <div className="w-11 h-11 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg border border-blue-200">
          {firstLetter}
        </div>

        {/* RIGHT: Details */}
        <div className="flex-1 min-w-0">
          
          {/* Name */}
          <h3 className="font-bold text-gray-900 text-base leading-tight truncate mb-1.5">
            {customer.name}
          </h3>

          {/* CONTACT INFO CONTAINER */}
          {/* Mobile: Vertical Stack (flex-col) | Desktop: Side-by-Side (md:flex-row) */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
            
            {/* Phone (Non-clickable) */}
            <div className="flex items-center gap-1 text-gray-600 shrink-0">
              <IconPhone className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="pointer-events-none select-none !no-underline text-[13px] font-medium !text-gray-600">
                {customer.phone || "No contact"}
              </span>
            </div>

            {/* Address (Non-clickable) */}
            {customer.address && (
              <div className="flex items-start md:items-center gap-1 text-sm text-gray-600">
                <IconMapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5 md:mt-0" />
                <span className="pointer-events-none select-none !no-underline text-[13px] font-medium !text-gray-600 line-clamp-1 md:line-clamp-none">
                  {customer.address}
                </span>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerCard;