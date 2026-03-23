import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconFilter, IconSearch, IconClose, IconChevronDown, IconCheckStroke } from "../icons";

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
// PERFORMANCE & SECURITY: Object.freeze ensures the V8 engine allocates these 
// to static memory and prevents malicious runtime mutations by third-party scripts.
const STATUS_OPTIONS = Object.freeze([
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "picked_up", label: "Picked Up" },
  { value: "delivered", label: "Delivered" }
]);

const DATE_OPTIONS = Object.freeze([
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7", label: "Last 7 Days" },
  { value: "last_30", label: "Last 30 Days" }
]);

const MAX_SEARCH_LENGTH = 100;

// ==========================================
// ATOMIC COMPONENTS
// ==========================================

/**
 * @component FilterDropdown
 * @description Highly reusable, memoized, and accessible dropdown component.
 */
const FilterDropdown = React.memo(({ 
  id, 
  options, 
  selectedValue, 
  onChange, 
  isOpen, 
  onToggle 
}) => {
  const currentLabel = useMemo(() => {
    return options.find(opt => opt.value === selectedValue)?.label || options[0].label;
  }, [options, selectedValue]);

  return (
    <div className="relative flex-1 lg:flex-none">
      <button
        id={`${id}-toggle`}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        className={`w-full lg:w-40 h-10 px-3 flex items-center justify-between bg-white border transition-all rounded-xl text-text-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50 ${isOpen ? "border-black" : "border-slate-200"}`}
      >
        <span className="truncate text-sm-text font-normal tracking-tight">{currentLabel}</span>
        <div className="flex items-center gap-1">
          <IconChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            id={`${id}-listbox`}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 lg:right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] overflow-hidden py-1"
            role="listbox"
            aria-labelledby={`${id}-toggle`}
          >
            {options.map((option) => {
              const isSelected = selectedValue === option.value;
              return (
                <button 
                  key={option.value} 
                  role="option"
                  aria-selected={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(option.value);
                  }} 
                  className={`w-full px-3 py-2 text-left text-sm-text flex items-center justify-between transition-colors tracking-tight focus:outline-none focus-visible:bg-slate-100 ${
                    isSelected ? "font-medium bg-slate-50 text-black" : "text-text-dark font-normal hover:bg-gray-50"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <IconCheckStroke className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
FilterDropdown.displayName = "FilterDropdown";

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function OrderFilters({ 
  statusFilter, setStatusFilter, 
  dateFilter, setDateFilter,
  searchTerm, setSearchTerm 
}) {
  // --- STATE & REFS ---
  const [openDropdown, setOpenDropdown] = useState(null); // 'status' | 'date' | null
  const containerRef = useRef(null);

  // --- LIFECYCLE & A11Y ---
  useEffect(() => {
    if (openDropdown === null) return;

    const handleOutsideClickAndEsc = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setOpenDropdown(null);
        return;
      }
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClickAndEsc);
    document.addEventListener("keydown", handleOutsideClickAndEsc);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClickAndEsc);
      document.removeEventListener("keydown", handleOutsideClickAndEsc);
    };
  }, [openDropdown]);

  // --- HANDLERS ---
  
  const handleSearchChange = useCallback((e) => {
    if (typeof setSearchTerm !== 'function') return;
    
    // SECURITY: Sanitize input to mitigate basic XSS and prevent massive payload bloat
    const safeValue = e.target.value.replace(/[<>]/g, "").substring(0, MAX_SEARCH_LENGTH);
    setSearchTerm(safeValue);
  }, [setSearchTerm]);

  const handleClearSearch = useCallback(() => {
    if (typeof setSearchTerm === 'function') setSearchTerm("");
  }, [setSearchTerm]);

  const toggleDropdown = useCallback((dropdownName) => {
    setOpenDropdown(prev => prev === dropdownName ? null : dropdownName);
  }, []);

  const handleStatusSelect = useCallback((value) => {
    if (typeof setStatusFilter === 'function') setStatusFilter(value);
    setOpenDropdown(null);
  }, [setStatusFilter]);

  const handleDateSelect = useCallback((value) => {
    if (typeof setDateFilter === 'function') setDateFilter(value);
    setOpenDropdown(null);
  }, [setDateFilter]);

  // --- RENDER ---
  return (
    <section 
      ref={containerRef} 
      className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full"
      aria-label="Order Filters"
    >
      {/* 1. INTEGRATED SEARCH BAR */}
      <div className="relative w-full lg:flex-1 group">
        <label htmlFor="order-search-input" className="sr-only">Search Orders</label>
        <IconSearch aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 group-focus-within:text-app-dark transition-colors" />
        <input
          id="order-search-input"
          type="text"         
          role="searchbox"      
          placeholder="Search name, phone, address, or order #..."
          value={searchTerm || ""}
          onChange={handleSearchChange}
          maxLength={MAX_SEARCH_LENGTH}
          className="flex h-10 w-full rounded-xl border font-normal border-slate-200 bg-white/80 pl-10 pr-10 py-2 text-sm-text text-text-dark placeholder:text-text-dark/40 outline-none focus:outline-none transition-all focus:border-slate-500 focus:bg-white focus:ring-0"
        />
        
        {searchTerm && (
          <button 
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-text-dark hover:bg-app-dark/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50"
            aria-label="Clear search"
          >
            <IconClose className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* 2. FILTER DROPDOWNS CONTAINER */}
      <div className="flex items-center gap-2 w-full lg:w-auto">
        <div className="hidden sm:flex items-center px-1 text-gray-400" aria-hidden="true">
          <IconFilter className="w-3.5 h-3.5" />
        </div>

        <FilterDropdown
          id="status-filter"
          options={STATUS_OPTIONS}
          selectedValue={statusFilter || "all"}
          isOpen={openDropdown === "status"}
          onToggle={() => toggleDropdown("status")}
          onChange={handleStatusSelect}
        />

        <FilterDropdown
          id="date-filter"
          options={DATE_OPTIONS}
          selectedValue={dateFilter || "all"}
          isOpen={openDropdown === "date"}
          onToggle={() => toggleDropdown("date")}
          onChange={handleDateSelect}
        />
      </div>
    </section>
  );
}