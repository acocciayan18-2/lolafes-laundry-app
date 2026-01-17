import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../style/main-app.css";
import "../style/sidebar.css";

import {
  IconChart,
  IconDashboard,
  IconPlus,
  IconSettings,
  IconShirt,
  IconUsers
} from "./icons";


const SIDEBAR_CONFIG = {
  menuItems: [
    { text: "Dashboard", to: "/main/dashboard", icon: <IconDashboard className="w-5 h-5" /> },
    { text: "New Order", to: "/main/neworder", icon: <IconPlus className="w-5 h-5" /> },
    { text: "Orders", to: "/main/orders", icon: <IconShirt className="w-5 h-5" /> },
    { text: "Customers", to: "/main/customers", icon: <IconUsers className="w-5 h-5" /> },
    { text: "Services", to: "/main/services", icon: <IconSettings className="w-5 h-5" /> },
    { text: "Reports", to: "/main/reports", icon: <IconChart className="w-5 h-5" /> },
  ],
  quickInfo: [
    { title: "today's orders", value: 0, bgColor: "bg-app-light", textColor: "text-text-dark" },
    { title: "ready for pickup", value: 0, bgColor: "bg-app-light", textColor: "text-text-dark" },
  ],
};

export default function Sidebar({ isOpen, setIsOpen }) {
  const [showConfirm, setShowConfirm] = useState(false);
 

  return (
    <>
      {/* 1. MOBILE BACKDROP */}
      <div 
        className={`fixed inset-0 backdrop-blur-sm z-[45] transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* 2. SIDEBAR CONTAINER */}
      {/* Changed fixed inset-y-0 to h-full to respect 100dvh parent */}
      <div className={`
        sidebar-container flex h-full fixed left-0 z-[50] transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Changed h-screen to h-full */}
        <aside className="sidebar w-64 bg-app-light flex flex-col h-full shadow-2xl lg:shadow-none">
          <div className="flex-1 flex flex-col overflow-hidden">
            <Logo />
            
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="p-3">
                <p className="text-[13px] font-medium  text-text-dark/70   uppercase px-2 py-2">Main Menu</p>
                <nav>
                  <ul className="space-y-2">
                    {SIDEBAR_CONFIG.menuItems.map((item) => (
                      <MenuItem key={item.text} {...item} closeSidebar={() => setIsOpen(false)} />
                    ))}
                  </ul>
                </nav>
              </div>
            </div>
          </div>

          {/* Bottom Section stays pinned above Safari's bottom bar */}
          <div className="bg-app-light border-t border-gray-50 pb-safe"> 
            <LogoutButton onClick={() => setShowConfirm(true)} />
            <FooterCard />
          </div>
        </aside>
      </div>

      {showConfirm && (
        <LogoutConfirmationModal 
          onCancel={() => setShowConfirm(false)} 
          onConfirm={() => {}} 
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
    <li >
      <button
        onClick={handleNavigation}
        className={` 
          group flex items-center gap-2 px-3 w-full text-left nav-page-btn transition-colors duration-200
          ${isActive 
            ? "active !bg-app-dark shadow-md" 
            : "bg-transparent hover:bg-transparent"
          }
        `}
      >
        <div className="shrink-0 flex items-center justify-center">
          {React.cloneElement(icon, {
            className: `${icon.props.className || ""} transition-colors duration-200 ${
              isActive
                ? "text-text-light !stroke-text-light"
                : "text-text-dark stroke-text-dark group-hover:!text-dark/70 group-hover:!stroke-text-dark/70"
            }`
          })}
        </div>
        <p className={`text-sm font-medium transition-colors duration-200 ${isActive ? "text-text-light" : "text-text-dark group-hover:text-text-dark/70"}`}>
          {text}
        </p>
      </button>
    </li>
  );
};
// --- These helper components stay exactly as you designed them ---



const Logo = () => (
  <div className="flex items-center gap-2.5 pl-5 pt-3.5 pb-3.5 w-full logo-con">
    <div className="w-10 h-10 bg-app-dark p-1  rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
      <img
        src="/images/lolafeslaundry-logo-transparent.png"
        alt="Logo"
        className="w-full h-full object-contain"
      />
    </div>
    <div className="flex flex-col items-start">
      <h2 className="font-bold text-text-dark text-lg leading-none">
        Lola Fe's Laundry
      </h2>
      <p className="text-xxs text-text-dark/90 font-medium">
        Manager System
      </p>
    </div>
  </div>
);


const LogoutButton = ({ onClick }) => (
  <div className="px-3 py-2.5">
    <div
      onClick={onClick}
      className="rounded-xl p-2.5  cursor-pointer hover:bg-app-dark/5  transition-colors flex items-center gap-2 w-full active:scale-95"
    >
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M13 12v.01"></path>
  <path d="M3 21h18"></path>
  <path d="M17 13.5V21"></path>
  <path d="M5 21V5a2 2 0 0 1 2-2h7.5"></path>
  <path d="M21 7h-7"></path>
  <path d="m18 4 3 3-3 3"></path>
</svg>
      <p className="text-xs font-medium text-text-dark/90">Log out</p>
    </div>
  </div>
);

const FooterCard = () => (
  <div className="bg-app-light rounded-xl p-2.5 border  cursor-pointer mx-3 mb-3  transition-colors">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-app-dark rounded-full flex items-center justify-center shadow-sm">
        <span className="text-text-light font-bold text-[10px]">LS</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-text-dark text-xs truncate">Main Branch</p>
        <p className="text-[10px] text-text-dark/90 font-medium truncate">Taguig City, PH</p>
      </div>
    </div>
  </div>
);

const LogoutConfirmationModal = ({ onCancel, onConfirm }) => (
  // fixed inset-0 covers the whole screen
  // z-[100] puts it above the sidebar (z-50)
  <div className="fixed inset-0 flex items-center justify-center bg-app-dark/10 backdrop-blur-md z-[100] p-4">
    {/* Animation and max-width for mobile responsiveness */}
    <div className="bg-app-light  rounded-3xl shadow-2xl p-6 w-full max-w-[340px] md:max-w-sm animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col items-center text-center">
        {/* Added a visual icon for better UX */}
        <div className="w-16 h-16 bg-app-dark rounded-full flex items-center justify-center mb-4">
           <svg width="24" height="24" fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M13 12v.01"></path>
  <path d="M3 21h18"></path>
  <path d="M17 13.5V21"></path>
  <path d="M5 21V5a2 2 0 0 1 2-2h7.5"></path>
  <path d="M21 7h-7"></path>
  <path d="m18 4 3 3-3 3"></path>
</svg>
        </div>
        
        <h3 className="text-xl font-bold mb-2 text-text-dark">Confirm Logout</h3>
        <p className="text-sm text-text-dark/80 mb-8">
          Are you sure you want to log out? Any unsaved changes might be lost.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            className="flex-1 order-2 sm:order-1 px-4 py-3 rounded-xl border border-1 border-app-dark/30 text-text-dark font-medium text-sm hover:bg-app-dark/10 active:scale-95 transition-all"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 order-1 sm:order-2 px-4 py-3 rounded-xl bg-app-dark text-text-light font-medium text-sm hover:bg-app-dark/90  active:scale-95 transition-all"
            onClick={onConfirm}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  </div>
);