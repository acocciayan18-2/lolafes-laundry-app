import { useEffect, useRef, useState } from "react";
import { IconFilter } from "../icons";

export default function OrderFilters({ statusFilter, setStatusFilter, dateFilter, setDateFilter }) {
  const [openDropdown, setOpenDropdown] = useState(null); // 'status', 'date', or null
  const dropdownRef = useRef(null);

  const statusOptions = [
    { value: "all", label: "All Orders" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "ready", label: "Ready for Pickup" },
    { value: "completed", label: "Completed" },
    { value: "picked_up", label: "Picked Up" }
  ];

  const dateOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last_7", label: "Last 7 Days" },
    { value: "last_30", label: "Last 30 Days" }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentStatusLabel = statusOptions.find(opt => opt.value === statusFilter)?.label;
  const currentDateLabel = dateOptions.find(opt => opt.value === (dateFilter || "all"))?.label;

  return (
    <div className="flex items-center gap-3" ref={dropdownRef}>
      {/* Icon container hidden on mobile */}
      <div className="hidden sm:flex items-center gap-1.5 text-gray-900">
        <IconFilter className="w-3.5 h-3.5" />
      </div>

      {/* STATUS FILTER */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
          className={`
            w-40 h-10 px-3 flex items-center justify-between
            bg-white border transition-all rounded-xl text-text-dark
            ${openDropdown === "status" ? "border-black " : "border-gray-200"}
            focus:outline-none focus:border-black
          `}
        >
          {/* UPDATED: text-sm-text font-bold */}
          <span className="truncate text-base-text font-normal tracking-tight">{currentStatusLabel}</span>
          <svg 
            className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === "status" ? "rotate-180" : ""}`} 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {openDropdown === "status" && (
          <div className="absolute left-0 lg:right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] overflow-hidden py-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setStatusFilter(option.value);
                  setOpenDropdown(null);
                }}
                className={`w-full px-3 py-2 text-left text-base-text flex items-center justify-between transition-colors tracking-tight hover:bg-gray-50
                  ${statusFilter === option.value ? " font-bold" : "text-text-dark font-normal"}
                `}
              >
                {option.label}
                {statusFilter === option.value && (
                  <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DATE FILTER */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(openDropdown === "date" ? null : "date")}
          className={`
            w-40 h-10 px-3 flex items-center justify-between
            bg-white border transition-all rounded-xl text-text-dark
            ${openDropdown === "date" ? "border-black " : "border-gray-200"}
             focus:outline-none focus:border-black
          `}
        >
          {/* UPDATED: text-sm-text font-bold */}
          <span className="truncate text-base-text font-normal  tracking-tight">{currentDateLabel}</span>
          <svg 
            className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === "date" ? "rotate-180" : ""}`} 
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {openDropdown === "date" && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] overflow-hidden py-1">
            {dateOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setDateFilter(option.value);
                  setOpenDropdown(null);
                }}
                className={`w-full px-3 py-2 text-left text-base-text flex items-center justify-between transition-colors tracking-tight hover:bg-gray-50
                  ${(dateFilter || "all") === option.value ? " font-bold" : "text-text-dark font-normal"}
                `}
              >
                {option.label}
                {(dateFilter || "all") === option.value && (
                  <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}