import { useEffect, useRef, useState } from "react";
import { IconFilter, IconSearch, IconClose, IconChevronDown, IconCheckStroke } from "../icons";

export default function OrderFilters({ 
  statusFilter, setStatusFilter, 
  dateFilter, setDateFilter,
  searchTerm, setSearchTerm 
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const statusOptions = [
    { value: "all", label: "All Orders" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "ready", label: "Ready" },
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
    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full" ref={dropdownRef}>
      
      {/* 1. INTEGRATED SEARCH BAR */}
      <div className="relative w-full lg:flex-1 group">
        <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 group-focus-within:text-app-dark transition-colors" />
        <input
          type="text"
          placeholder="Search name, phone, address, or order #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex h-10 w-full rounded-xl border font-normal border-slate-200 bg-white/80 pl-10 pr-10 py-2 text-base-text text-text-dark placeholder:text-text-dark/40 outline-none transition-all focus:border-app-dark/70 focus:bg-white focus:ring-0"
        />
        {/* Quick Clear for Search */}
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-text-dark hover:bg-app-dark/5 transition-colors"
          >
            <IconClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. FILTER DROPDOWNS CONTAINER */}
      <div className="flex items-center gap-2 w-full lg:w-auto">
        <div className="hidden sm:flex items-center px-1 text-gray-400">
          <IconFilter className="w-3.5 h-3.5" />
        </div>

        {/* STATUS FILTER */}
        <div className="relative flex-1 lg:flex-none">
          <button
            onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
            className={`w-full lg:w-40 h-10 px-3 flex items-center justify-between bg-white border transition-all rounded-xl text-text-dark ${openDropdown === "status" ? "border-black" : "border-slate-200"}`}
          >
            <span className="truncate text-base-text font-normal tracking-tight">{currentStatusLabel}</span>
            <div className="flex items-center gap-1">
             
              <IconChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === "status" ? "rotate-180" : ""}`} />
            </div>
          </button>
          {openDropdown === "status" && (
            <div className="absolute left-0 lg:right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] overflow-hidden py-1">
              {statusOptions.map((option) => (
                <button key={option.value} onClick={() => { setStatusFilter(option.value); setOpenDropdown(null); }} className={`w-full px-3 py-2 text-left text-base-text flex items-center justify-between transition-colors tracking-tight hover:bg-gray-50 ${statusFilter === option.value ? "font-bold bg-slate-50 text-blue-600" : "text-text-dark font-normal"}`}>
                  {option.label}
                  {statusFilter === option.value && <IconCheckStroke className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DATE FILTER */}
        <div className="relative flex-1 lg:flex-none">
          <button
            onClick={() => setOpenDropdown(openDropdown === "date" ? null : "date")}
            className={`w-full lg:w-40 h-10 px-3 flex items-center justify-between bg-white border transition-all rounded-xl text-text-dark ${openDropdown === "date" ? "border-black" : "border-slate-200"}`}
          >
            <span className="truncate text-base-text font-normal tracking-tight">{currentDateLabel}</span>
            <div className="flex items-center gap-1">
             
              <IconChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === "date" ? "rotate-180" : ""}`} />
            </div>
          </button>
          {openDropdown === "date" && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] overflow-hidden py-1">
              {dateOptions.map((option) => (
                <button key={option.value} onClick={() => { setDateFilter(option.value); setOpenDropdown(null); }} className={`w-full px-3 py-2 text-left text-base-text flex items-center justify-between transition-colors tracking-tight hover:bg-gray-50 ${(dateFilter || "all") === option.value ? "font-bold bg-slate-50 text-blue-600" : "text-text-dark font-normal"}`}>
                  {option.label}
                  {(dateFilter || "all") === option.value && <IconCheckStroke className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}