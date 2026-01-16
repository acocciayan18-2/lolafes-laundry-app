import React from "react";
import { IconPhone, IconMapPin } from "../icons";

const CustomerCard = ({ customer }) => {
  const firstLetter = customer.name ? customer.name.charAt(0).toUpperCase() : "?";

  return (
    <div className="w-full bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-2 hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="flex items-center gap-4">
        
        {/* LEFT: Avatar Icon - Using text-h3 for the initial */}
        <div className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center text-text-dark font-bold text-h3 border border-app-dark/30">
          {firstLetter}
        </div>

        {/* RIGHT: Details */}
        <div className="flex-1 min-w-0">
          
          {/* Name - Using text-base-text (15px) */}
          <h3 className="font-bold text-gray-900 text-sm-text  mb-1.5 line-clamp-2 break-words uppercase">
            {customer.name}
          </h3>

          {/* CONTACT INFO CONTAINER */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
            
            {/* Phone - Using text-sm-text (13px) */}
            <div className="flex items-center gap-1 text-gray-600 shrink-0">
              <IconPhone className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="block cursor-default select-none pointer-events-none text-sm-text font-medium text-gray-600 lowercase">
                {customer.phone || "no contact"}
              </span>
            </div>

            {/* Address - Using text-sm-text (13px) */}
            {customer.address && (
              <div className="flex items-start md:items-center gap-1 text-gray-600 min-w-0">
                <IconMapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5 md:mt-0" />
                <span className="cursor-default select-none pointer-events-none text-sm-text font-medium text-gray-600 line-clamp-1 lowercase">
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