import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { IconFilter, IconSearch, IconClose, IconChevronDown, IconCheckStroke } from "../icons";

// 1. PERFORMANCE: Move static arrays OUTSIDE the component.
// This prevents React from recreating these arrays in memory on every single keystroke.
const STATUS_OPTIONS = [
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "picked_up", label: "Picked Up" },
  { value: "delivered", label: "Delivered" }
];

const DATE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7", label: "Last 7 Days" },
  { value: "last_30", label: "Last 30 Days" }
];

export default function OrderFilters({ 
  statusFilter, setStatusFilter, 
  dateFilter, setDateFilter,
  searchTerm, setSearchTerm 
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // 2. UX & SECURITY: Combined Event Listener for Clicks & Keyboard
  useEffect(() => {
    const handleOutsideClickAndEsc = (event) => {
      // Handle 'Escape' key press to close dropdowns
      if (event.type === 'keydown' && event.key === 'Escape') {
        setOpenDropdown(null);
        return;
      }
      // Handle clicking outside of the dropdown container
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    // Only attach listeners if a dropdown is actually open (saves CPU cycles)
    if (openDropdown !== null) {
      document.addEventListener("mousedown", handleOutsideClickAndEsc);
      document.addEventListener("keydown", handleOutsideClickAndEsc);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClickAndEsc);
      document.removeEventListener("keydown", handleOutsideClickAndEsc);
    };
  }, [openDropdown]);

  // 3. PERFORMANCE: Memoize label lookups
  // Instead of running .find() on every keystroke, React remembers the result until the filter changes.
  const currentStatusLabel = useMemo(() => {
    return STATUS_OPTIONS.find(opt => opt.value === statusFilter)?.label || "All Orders";
  }, [statusFilter]);

  const currentDateLabel = useMemo(() => {
    return DATE_OPTIONS.find(opt => opt.value === (dateFilter || "all"))?.label || "All Time";
  }, [dateFilter]);

  // Clean handler for search clearing
  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, [setSearchTerm]);

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
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-text-dark hover:bg-app-dark/5 transition-colors"
            aria-label="Clear search"
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
            aria-haspopup="listbox"
            aria-expanded={openDropdown === "status"}
            className={`w-full lg:w-40 h-10 px-3 flex items-center justify-between bg-white border transition-all rounded-xl text-text-dark ${openDropdown === "status" ? "border-black" : "border-slate-200"}`}
          >
            <span className="truncate text-base-text font-normal tracking-tight">{currentStatusLabel}</span>
            <div className="flex items-center gap-1">
              <IconChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === "status" ? "rotate-180" : ""}`} />
            </div>
          </button>
          {openDropdown === "status" && (
            <div 
              className="absolute left-0 lg:right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] overflow-hidden py-1"
              role="listbox"
            >
              {STATUS_OPTIONS.map((option) => (
                <button 
                  key={option.value} 
                  role="option"
                  aria-selected={statusFilter === option.value}
                  onClick={() => { setStatusFilter(option.value); setOpenDropdown(null); }} 
                  className={`w-full px-3 py-2 text-left text-base-text flex items-center justify-between transition-colors tracking-tight hover:bg-gray-50 ${statusFilter === option.value ? "font-bold bg-slate-50 text-black-600" : "text-text-dark font-normal"}`}
                >
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
            aria-haspopup="listbox"
            aria-expanded={openDropdown === "date"}
            className={`w-full lg:w-40 h-10 px-3 flex items-center justify-between bg-white border transition-all rounded-xl text-text-dark ${openDropdown === "date" ? "border-black" : "border-slate-200"}`}
          >
            <span className="truncate text-base-text font-normal tracking-tight">{currentDateLabel}</span>
            <div className="flex items-center gap-1">
              <IconChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === "date" ? "rotate-180" : ""}`} />
            </div>
          </button>
          {openDropdown === "date" && (
            <div 
              className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] overflow-hidden py-1"
              role="listbox"
            >
              {DATE_OPTIONS.map((option) => (
                <button 
                  key={option.value} 
                  role="option"
                  aria-selected={(dateFilter || "all") === option.value}
                  onClick={() => { setDateFilter(option.value); setOpenDropdown(null); }} 
                  className={`w-full px-3 py-2 text-left text-base-text flex items-center justify-between transition-colors tracking-tight hover:bg-gray-50 ${(dateFilter || "all") === option.value ? "font-bold bg-slate-50 text-black-600" : "text-text-dark font-normal"}`}
                >
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