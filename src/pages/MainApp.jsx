import React, { useState, useRef, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Dashboard from "./Dashboard";
import Orders from "./Orders";
import Reports from "./Reports";
import NewOrder from "./NewOrder";
import Customers from "./Customers";
import Services from "./Services";
import "../style/main-app.css";
import "../style/index.css";

export default function MainApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollContainerRef = useRef(null);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const currentScrollY = scrollContainerRef.current.scrollTop;

    if (currentScrollY < lastScrollY) {
      setShowHeader(true);
    } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
      setShowHeader(false);
    }
    setLastScrollY(currentScrollY);
  };

  return (
    /* h-[100dvh] is vital for mobile to ignore the browser address bar height */
    <div className="flex h-[100dvh] w-full bg-gray-50 mainapp-con relative overflow-hidden">
      
      {/* 1. SIDEBAR: Ensure this is rendered with a high z-index (z-50) inside its file */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* 2. OVERLAY BACKDROP: Only visible on mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[45] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* MOBILE HEADER: z-40 so it stays below the Sidebar (z-50) */}
        <header 
          className={`lg:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 bg-white border-b border-gray-100 shadow-sm z-40 transition-transform duration-300 ${
            showHeader ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <img src="/images/lolafeslaundry-logo.png" alt="Logo" className="w-7 h-7 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 text-sm leading-none">Lola Fe's</span>
              <span className="text-[10px] text-blue-600 font-medium uppercase tracking-tighter">Manager</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          </button>
        </header>

        <main 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto no-scrollbar pt-16 lg:pt-0"
        >
          <Routes>
            <Route path="/" element={<Navigate to="/main/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/neworder" element={<NewOrder />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/services" element={<Services />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}