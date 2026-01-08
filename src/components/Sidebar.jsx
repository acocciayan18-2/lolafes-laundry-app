import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import "../style/sidebar.css";
import "../style/main-app.css";

const SIDEBAR_CONFIG = {
  menuItems: [
    {
      text: "Dashboard",
      to: "/main/dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-sidebar">
          <rect width="7" height="9" x="3" y="3" rx="1"></rect>
          <rect width="7" height="5" x="14" y="3" rx="1"></rect>
          <rect width="7" height="9" x="14" y="12" rx="1"></rect>
          <rect width="7" height="5" x="3" y="16" rx="1"></rect>
        </svg>
      )
    },
    {
      text: "New Order",
      to: "/main/neworder",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
          <path d="M5 12h14"></path>
          <path d="M12 5v14"></path>
        </svg>
      )
    },
    {
      text: "Orders",
      to: "/main/orders",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shirt">
          <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
        </svg>
      )
    },
    {
      text: "Customers",
      to: "/main/customers",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      text: "Services",
      to: "/main/services",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      )
    },
    {
      text: "Reports",
      to: "/main/reports",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chart-column">
          <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
          <path d="M18 17V9"></path>
          <path d="M13 17V5"></path>
          <path d="M8 17v-3"></path>
        </svg>
      )
    },
  ],
  quickInfo: [
    { title: "Today's Orders", value: 0, bgColor: "from-green-50 to-emerald-50", textColor: "text-green-700" },
    { title: "Ready for Pickup", value: 0, bgColor: "from-orange-50 to-amber-50", textColor: "text-orange-700" },
  ],
};



export default function Sidebar({ isOpen, setIsOpen }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      {/* 1. MOBILE BACKDROP */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[45] transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* 2. SIDEBAR CONTAINER */}
      <div className={`
        sidebar-container flex h-screen fixed inset-y-0 left-0 z-[50] transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <aside className="sidebar w-64 bg-white flex flex-col h-screen shadow-2xl lg:shadow-none">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between">
              <Logo />
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* Navigation */}
              <div className="p-3">
                <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2">Main Menu</p>
                <nav>
                  <ul className="space-y-1">
                    {SIDEBAR_CONFIG.menuItems.map((item) => (
                      <MenuItem key={item.text} {...item} closeSidebar={() => setIsOpen(false)} />
                    ))}
                  </ul>
                </nav>
              </div>

              {/* Quick Info */}
              <div className="px-3 pt-2 pb-3">
                <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2 pt-1">Quick Info</p>
                <div className="px-3 py-1 space-y-3">
                  {SIDEBAR_CONFIG.quickInfo.map((card) => (
                    <InfoCard key={card.title} {...card} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-t border-gray-50">
            <LogoutButton onClick={() => setShowConfirm(true)} />
            <FooterCard />
          </div>
        </aside>
      </div>

      {/* 3. MODAL - MOVED OUTSIDE SIDEBAR CONTAINER */}
      {/* This ensures it centers based on the window, not the sidebar div */}
      {showConfirm && (
        <LogoutConfirmationModal 
          onCancel={() => setShowConfirm(false)} 
          onConfirm={handleLogout} 
        />
      )}
    </>
  );
}

// Updated MenuItem to include auto-close on mobile
const MenuItem = ({ to, icon, text, closeSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = () => {
    navigate(to);
    if (window.innerWidth < 1024) closeSidebar();
  };

  const isActive = location.pathname === to;

  return (
    <li>
      <button
        onClick={handleNavigation}
        className={`
          group flex items-center gap-2 px-3 w-full text-left nav-page-btn transition-colors duration-200
          ${isActive 
            ? "active bg-blue-600 shadow-md" 
            : "bg-transparent hover:bg-transparent"
          }
        `}
      >
        <div className="shrink-0 flex items-center justify-center">
          {React.cloneElement(icon, {
            className: `${icon.props.className || ""} transition-colors duration-200 ${
              isActive
                ? "!text-white !stroke-white"
                : "text-gray-600 stroke-gray-600 group-hover:!text-blue-600 group-hover:!stroke-blue-600"
            }`
          })}
        </div>
        <p className={`text-sm font-medium transition-colors duration-200 ${isActive ? "text-white" : "text-gray-600 group-hover:text-blue-600"}`}>
          {text}
        </p>
      </button>
    </li>
  );
};
// --- These helper components stay exactly as you designed them ---

const InfoCard = ({ title, value, bgColor, textColor }) => (
  <div className={`bg-gradient-to-r ${bgColor} p-2 rounded-xl border ${textColor}`}>
    <div className="flex items-center justify-between px-1">
      <span className={`font-medium text-sm ${textColor}`}>{title}</span>
      <span className={`font-bold text-xs ${textColor}`}>{value}</span>
    </div>
  </div>
);

const Logo = () => (
  <div className="flex items-center gap-2.5 pl-5 pt-3.5 pb-3.5 w-full logo-con">
    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
      <img
        src="/images/lolafeslaundry-logo.png"
        alt="Logo"
        className="w-full h-full object-contain"
      />
    </div>
    <div className="flex flex-col items-start">
      <h2 className="font-bold text-gray-900 text-lg leading-none">
        Lola Fe's Laundry
      </h2>
      <p className="text-xxs text-blue-600 font-medium">
        Manager System
      </p>
    </div>
  </div>
);


const LogoutButton = ({ onClick }) => (
  <div className="px-3 py-2.5">
    <div
      onClick={onClick}
      className="rounded-xl p-2.5 border cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors flex items-center gap-2 w-full active:scale-95"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-red-500" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0z" />
        <path fillRule="evenodd" d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708z" />
      </svg>
      <p className="text-xs font-bold text-gray-700">Log out</p>
    </div>
  </div>
);

const FooterCard = () => (
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2.5 border border-blue-100 cursor-pointer mx-3 mb-3 hover:border-blue-300 transition-colors">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
        <span className="text-white font-bold text-[10px]">LS</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-xs truncate">Main Branch</p>
        <p className="text-[10px] text-blue-600 font-medium truncate">Taguig City, PH</p>
      </div>
    </div>
  </div>
);

const LogoutConfirmationModal = ({ onCancel, onConfirm }) => (
  // fixed inset-0 covers the whole screen
  // z-[100] puts it above the sidebar (z-50)
  <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-[100] p-4">
    {/* Animation and max-width for mobile responsiveness */}
    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-[340px] md:max-w-sm animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col items-center text-center">
        {/* Added a visual icon for better UX */}
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        
        <h3 className="text-xl font-bold mb-2 text-gray-900">Confirm Logout</h3>
        <p className="text-sm text-gray-500 mb-8">
          Are you sure you want to log out? Any unsaved changes might be lost.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            className="flex-1 order-2 sm:order-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 active:scale-95 transition-all"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 order-1 sm:order-2 px-4 py-3 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 shadow-lg shadow-red-200 active:scale-95 transition-all"
            onClick={onConfirm}
          >
            Yes, Log Out
          </button>
        </div>
      </div>
    </div>
  </div>
);