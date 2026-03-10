import { useRef, useState, useEffect, useCallback } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

// --- IMPORTS ---
import Sidebar from "../components/Sidebar";
import { NetworkToast } from "../components/NetworkToast";
import "../style/index.css";
import "../style/main-app.css";

// --- PAGES ---
import Customers from "./Customers";
import Dashboard from "./Dashboard";
import NewOrder from "./NewOrder";
import Orders from "./Orders";
import Reports from "./Reports";
import Services from "./Services";
import Settings from "./Settings";

export default function MainApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const scrollContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  
  const location = useLocation();

  // ==========================================
  // 1. LIFECYCLE & ACCESSIBILITY
  // ==========================================

  // Auto-close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Fix iOS Safari 100dvh bug by setting real viewport height
  useEffect(() => {
    const setRealVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setRealVh();
    window.addEventListener('resize', setRealVh);
    return () => window.removeEventListener('resize', setRealVh);
  }, []);

  // Allow closing sidebar via Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSidebarOpen]);

  // ==========================================
  // 2. PERFORMANCE OPTIMIZED SCROLLING
  // ==========================================
  
  // Throttle scroll events using requestAnimationFrame to prevent layout thrashing
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    if (scrollTimeoutRef.current) {
      window.cancelAnimationFrame(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.requestAnimationFrame(() => {
      const currentScrollY = scrollContainerRef.current.scrollTop;

      // Allow a 10px threshold to prevent hyper-sensitive jittering
      if (currentScrollY < lastScrollY - 10) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY + 10 && currentScrollY > 50) {
        setShowHeader(false);
      }
      
      setLastScrollY(currentScrollY);
    });
  }, [lastScrollY]);

  return (
    // Style applied inline to support the iOS height fix fallback
    <div 
      className="flex w-full bg-app-light mainapp-con relative overflow-hidden"
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
    >
      
      {/* GLOBAL NOTIFICATIONS */}
      <NetworkToast />

      {/* SIDEBAR NAVIGATION */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* MOBILE OVERLAY (Click outside to close) */}
      <div 
        className={`fixed inset-0 z-[45] transition-all duration-300 lg:hidden ${
          isSidebarOpen 
            ? "bg-slate-900/20 backdrop-blur-sm visible opacity-100" 
            : "bg-transparent backdrop-blur-0 invisible opacity-0"
        }`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
         
         {/* MOBILE APP HEADER */}
         <header 
          className={`lg:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 bg-app-light border-b border-gray-100 shadow-sm z-40 transition-transform duration-300 ${
            showHeader ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-app-dark rounded-xl flex items-center justify-center shadow-md">
                <img 
                  src="/images/lolafeslaundry-logo-transparent.png" 
                  alt="Lola Fe's Laundry Logo" 
                  className="w-7 h-7 object-contain" 
                />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-text-dark text-sm leading-none tracking-tight">Lola Fe's Laundry</span>
              <span className="text-[11px] text-text-dark/70 font-medium">Laundry Shop</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-text-dark/70 hover:text-text-dark hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-app-dark/20"
            aria-label="Open Navigation Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          </button>
        </header>

        {/* MAIN CONTENT ROUTER */}
        <main 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto no-scrollbar bg-app-light pt-16 lg:pt-0 h-full transition-transform duration-300 ${
            isSidebarOpen && "scale-[0.98] origin-right opacity-90"
          }`}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/main/dashboard" replace />} />
            
            {/* Core Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/neworder" element={<NewOrder />} />
            <Route path="/reports" element={<Reports />} />
            
            {/* Management Routes */}
            <Route path="/customers" element={<Customers />} />
            <Route path="/services" element={<Services />} />
            <Route path="/settings" element={<Settings />} />

            {/* Fallback Route: Catch invalid URLs inside /main/* and redirect safely */}
            <Route path="*" element={<Navigate to="/main/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}