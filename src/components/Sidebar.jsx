import { signOut } from "firebase/auth";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import "../style/main-app.css";
import "../style/sidebar.css";

import {
  IconChart,
  IconDashboard,
  IconGridPlus,
  IconPlus,
  IconSettings,
  IconShirt,
  IconUsers,
  IconMinimizeSidebar,
  IconMaximizeSidebar 
} from "./icons";

const SIDEBAR_CONFIG = {
  menuItems: [
    { text: "Dashboard", to: "/main/dashboard", icon: <IconDashboard className="w-5 h-5" /> },
    { text: "New Order", to: "/main/neworder", icon: <IconPlus className="w-5 h-5" /> },
    { text: "Orders", to: "/main/orders", icon: <IconShirt className="w-5 h-5" /> },
    { text: "Customers", to: "/main/customers", icon: <IconUsers className="w-5 h-5" /> },
    { text: "Services", to: "/main/services", icon: <IconGridPlus className="w-5 h-5" /> },
    { text: "Reports", to: "/main/reports", icon: <IconChart className="w-5 h-5" /> },
    { text: "Settings", to: "/main/settings", icon: <IconSettings className="w-5 h-5" /> },
  ],
};

export default function Sidebar({ isOpen, setIsOpen }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      setIsMinimized(false);
    }
  }, [isOpen]);

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
        className={`fixed inset-0 backdrop-blur-sm z-[45] transition-opacity duration-200 lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* 2. SIDEBAR CONTAINER */}
      <div className={`
        sidebar-container flex h-full fixed left-0 z-[50] 
        transition-all ease-in-out lg:duration-300 duration-150
        lg:relative lg:translate-x-0 
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isMinimized ? "lg:w-20" : "lg:w-64"}
      `}>
        <aside className={`
          sidebar bg-app-light flex flex-col h-full  
          transition-all ease-in-out lg:duration-300 duration-150
          w-64 ${isMinimized ? "lg:w-20" : "lg:w-64"}
        `}>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Logo isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="p-3">
                <div className={`transition-all duration-300 overflow-hidden ${isMinimized ? "lg:opacity-0 lg:h-0" : "opacity-100 h-9"}`}>
                   <p className="text-[13px] font-medium text-text-dark/70 uppercase px-2 py-2 whitespace-nowrap">Main Menu</p>
                </div>
                <nav>
                  <ul className="space-y-2">
                    {SIDEBAR_CONFIG.menuItems.map((item) => (
                      <MenuItem 
                        key={item.text} 
                        {...item} 
                        isMinimized={isMinimized} 
                        closeSidebar={() => setIsOpen(false)} 
                      />
                    ))}
                  </ul>
                </nav>
              </div>
            </div>
          </div>

          <div className="bg-app-light border-t border-gray-50 pb-safe"> 
            <LogoutButton isMinimized={isMinimized} onClick={() => setShowConfirm(true)} />
            <FooterCard isMinimized={isMinimized} />
          </div>
        </aside>
      </div>

      {showConfirm && (
        <LogoutConfirmationModal 
          onCancel={() => setShowConfirm(false)} 
          onConfirm={handleLogout}
        />
      )}
    </>
  );
}

const MenuItem = ({ to, icon, text, closeSidebar, isMinimized }) => {
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
          group flex items-center w-full text-left nav-page-btn transition-all duration-300 px-3 gap-2
          ${isActive ? "active !bg-app-dark " : "bg-transparent hover:bg-transparent"}
        `}
      >
        {/* ICON CONTAINER: Removed dynamic margins, keeping it locked to px-3 padding */}
        <div className={`shrink-0 flex items-center justify-center transition-all duration-300 ${isMinimized ? "lg:ml-[-3px]" : ""}`}>
          {React.cloneElement(icon, {
            className: `${icon.props.className || ""} transition-colors duration-200 ${
              isActive
                ? "text-text-light !stroke-text-light"
                : "text-text-dark stroke-text-dark group-hover:!text-dark/70 group-hover:!stroke-text-dark/70"
            }`
          })}
        </div>
        
        {/* TEXT CONTAINER: Fading and collapsing width */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isMinimized ? "lg:opacity-0 lg:max-w-0 lg:pointer-events-none" : "opacity-100 max-w-[200px]"}`}>
          <p className={`text-sm font-medium ${isActive ? "text-text-light" : "text-text-dark group-hover:text-text-dark/70"}`}>
            {text}
          </p>
        </div>
      </button>
    </li>
  );
};

const Logo = ({ isMinimized, setIsMinimized }) => (
  <div className={`
    flex items-center transition-all duration-300 min-h-[76px] border-b border-gray-50/50
    ${isMinimized ? "lg:justify-center lg:px-0 lg:border-transparent" : "justify-between px-4"}
  `}>
    
    <div className={`
      flex items-center transition-all duration-300 overflow-hidden whitespace-nowrap
      ${isMinimized ? "lg:opacity-0 lg:max-w-0 lg:scale-95 lg:gap-0" : "opacity-100 max-w-[200px] scale-100 gap-2.5"}
    `}>
      <div className="w-10 h-10 bg-app-dark p-1.5 rounded-xl flex items-center justify-center  overflow-hidden shrink-0">
        <img src="/images/lolafeslaundry-logo-transparent.png" alt="Logo" className="w-full h-full object-contain" />
      </div>
      <div className="flex flex-col items-start">
        <h2 className="font-bold text-text-dark text-[15px] leading-tight">Lola Fe's Laundry</h2>
        <p className="text-[11px] text-text-dark/60 font-medium tracking-wider">Manager System</p>
      </div>
    </div>

    <button 
      onClick={() => setIsMinimized(!isMinimized)}
      className="hidden lg:flex p-1.5 rounded-lg text-text-dark/40 hover:text-text-dark cursor-ew-resize transition-all shrink-0"
    >
      {isMinimized ? <IconMaximizeSidebar className="w-5 h-5 text-text-dark/40 hover:text-text-dark" /> : <IconMinimizeSidebar className="w-5 h-5" />}
    </button>
  </div>
);

const LogoutButton = ({ onClick, isMinimized }) => (
  <div className="px-3 py-2.5">
    <div onClick={onClick} className="rounded-xl cursor-pointer hover:bg-app-dark/5 transition-all duration-300 flex items-center w-full active:scale-95 p-2.5 gap-2">
      <div className={`shrink-0 flex items-center justify-center transition-all duration-300 ${isMinimized ? "lg:border-transparent lg:bg-transparent ml-[5px]" : "border border-gray-100"}`}>
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 12v.01"></path><path d="M3 21h18"></path><path d="M17 13.5V21"></path><path d="M5 21V5a2 2 0 0 1 2-2h7.5"></path><path d="M21 7h-7"></path><path d="m18 4 3 3-3 3"></path>
        </svg>
      </div>
      <div className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isMinimized ? "lg:opacity-0 lg:max-w-0 lg:pointer-events-none" : "opacity-100 max-w-[200px]"}`}>
        <p className="text-xs font-medium text-text-dark/90">Log out</p>
      </div>
    </div>
  </div>
);

const FooterCard = ({ isMinimized }) => (
  <div className="px-3 pb-3">
    {/* FOOTER CONTAINER: Kept p-2.5 static so the LS circle never moves */}
    <div className={`
      bg-app-light rounded-xl cursor-pointer transition-all duration-300 p-2.5
      ${isMinimized ? "lg:border-transparent lg:bg-transparent" : "border border-gray-100"}
    `}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-app-dark rounded-full flex items-center justify-center  shrink-0">
          <span className="text-text-light font-bold text-[10px]">LS</span>
        </div>
        <div className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isMinimized ? "lg:opacity-0 lg:max-w-0" : "opacity-100 max-w-[200px]"}`}>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-text-dark text-xs truncate">Main Branch</p>
            <p className="text-[10px] text-text-dark/90 font-medium truncate">Taguig City, PH</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LogoutConfirmationModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-app-dark/40 backdrop-blur-sm z-[100] p-4">
    <div className="bg-app-light rounded-3xl p-6 w-full max-w-[340px] md:max-w-sm animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-app-dark rounded-full flex items-center justify-center mb-4">
           <svg width="24" height="24" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 12v.01"></path><path d="M3 21h18"></path><path d="M17 13.5V21"></path><path d="M5 21V5a2 2 0 0 1 2-2h7.5"></path><path d="M21 7h-7"></path><path d="m18 4 3 3-3 3"></path>
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2 text-text-dark">Confirm Logout</h3>
        <p className="text-sm text-text-dark/80 mb-8">Are you sure you want to log out?</p>
        <div className="flex flex-row gap-3 w-full">
          <button className="flex-1 order-2 px-4 py-2 md:text-sm text-sm-text font-medium !border !border-1 !border-app-dark rounded-lg transition-all" onClick={onCancel}>Cancel</button>
          <button className="flex-1 order-1 px-4 py-2 md:text-sm text-sm-text font-medium !bg-app-dark text-white rounded-lg transition-all" onClick={onConfirm}>Log Out</button>
        </div>
      </div>
    </div>
  </div>
);