import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Dashboard from "./Dashboard";
import Orders from "./Orders";
import Reports from "./Reports";
import NewOrder from "./NewOrder";
import Customers from "./Customers";
import Services from "./Services";
import "../style/main-app.css";

export default function MainApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    /* Change: Added h-[100dvh] here to force the fix on the wrapper */
    <div className="flex h-[100dvh] w-full bg-gray-50 mainapp-con relative overflow-hidden">
      
      {/* Sidebar - receives visibility props */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Mobile Top Header (Visible only on lg:hidden) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md overflow-hidden">
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

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto mainapp-pages-con">
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