import React, { useState, useRef, useEffect } from "react";
import { IconFilter } from "../icons";

export default function OrderFilters({ statusFilter, setStatusFilter }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const statusOptions = [
    { value: "all", label: "All Orders" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "ready", label: "Ready for Pickup" },
    { value: "completed", label: "Completed" },
    { value: "picked_up", label: "Picked Up" }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = statusOptions.find(opt => opt.value === statusFilter)?.label;

  return (
    <div className="flex items-center gap-2" ref={dropdownRef}>
  {/* Icon container hidden on mobile */}
  <div className="hidden sm:flex items-center gap-1.5 text-gray-900">
    <IconFilter className="w-3.5 h-3.5" />
  </div>

  <div className="relative">
    {/* Dropdown Trigger Button */}
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={`
        w-40 h-10 px-3 flex items-center justify-between
        bg-white border transition-all rounded-xl text-gray-900
        ${isOpen ? "border-black ring-0 shadow-sm" : "border-gray-200"}
        hover:border-gray-400 focus:outline-none focus:border-black
      `}
    >
      <span className="truncate text-sm font-medium">{currentLabel}</span>
      <svg 
        className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    {/* Custom Dropdown Menu */}
    {isOpen && (
      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] overflow-hidden py-1">
        {statusOptions.map((option) => {
          const isActive = statusFilter === option.value;
          return (
            <button
              key={option.value}
              onClick={() => {
                setStatusFilter(option.value);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
            >
              {option.label}
              {isActive && (
                <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    )}
  </div>
</div>

  );
}