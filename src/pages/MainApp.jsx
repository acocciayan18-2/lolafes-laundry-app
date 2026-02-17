import { useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"; // Added routing hooks
import Sidebar from "../components/Sidebar";
import "../style/index.css";
import "../style/main-app.css";
import Customers from "./Customers";
import Dashboard from "./Dashboard";
import NewOrder from "./NewOrder";
import Orders from "./Orders";
import Reports from "./Reports";
import Services from "./Services";

export default function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollContainerRef = useRef(null);

  // --- TOUR TRIGGER LOGIC ---
  const handleStartTour = () => {
    // We clear the 'done' flag so the tour can restart
    localStorage.removeItem('lola_tour_done');
    
    // Navigate to the current path but add the tour trigger
    // This works regardless of which page you are currently on!
    navigate(`${location.pathname}?tour=active`);
  };

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
    <div className="flex h-[100dvh] w-full bg-app-light mainapp-con relative overflow-hidden">
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Glass Overlay */}
      <div 
        className={`fixed inset-0 z-[45] transition-all duration-300 lg:hidden ${
          isSidebarOpen 
            ? "bg-white/30 backdrop-blur-[0px] visible opacity-100" 
            : "bg-transparent backdrop-blur-0 invisible opacity-0"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Mobile Header */}
        <header 
          className={`lg:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 bg-app-light border-b border-gray-100 shadow-sm z-40 transition-transform duration-300 ${
            showHeader ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-app-dark rounded-xl flex items-center justify-center shadow-md">
                <img src="/images/lolafeslaundry-logo-transparent.png" alt="Logo" className="w-7 h-7 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-text-dark text-sm leading-none ">Lola Fe's Laundry</span>
              <span className="text-[11px] text-text-dark/90 font-medium">Laundry Shop</span>
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

        {/* Scrollable area */}
        <main 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto no-scrollbar bg-app-light pt-16 lg:pt-0 h-full transition-all duration-300 ${
            isSidebarOpen && "scale-[0.98] origin-right"
          }`}
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

        {/* --- FLOATING HELP BUTTON --- */}
        <button
          onClick={handleStartTour}
          className="fixed bottom-6 right-6 z-[100] group flex items-center gap-2 bg-app-dark text-white p-3 md:px-4 md:py-3 rounded-2xl shadow-2xl hover:bg-slate-800 active:scale-95 transition-all duration-300 border border-white/10"
          title="Start App Tour"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-6 h-6 text-emerald-400 group-hover:rotate-12 transition-transform" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="hidden md:block font-bold text-sm">Need Help?</span>
        </button>

      </div>
    </div>
  );
}