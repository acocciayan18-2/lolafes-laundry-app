import React, { useState, useEffect } from "react";
import { IconShieldLock } from "../icons";

const SessionSecurity = () => {
  const [autoLogout, setAutoLogout] = useState(false);

  // Sync with localStorage on mount
  useEffect(() => {
    const enabled = localStorage.getItem("auto_logout_enabled") === "true";
    setAutoLogout(enabled);
  }, []);

  const toggleAutoLogout = () => {
    const newState = !autoLogout;
    setAutoLogout(newState);
    localStorage.setItem("auto_logout_enabled", newState.toString());
  };

  return (
    
    <div className="h-fit bg-white p-6 rounded-3xl border border-app-dark/10 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-xl">
            <IconShieldLock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base-text font-bold text-text-dark">Security</h3>
            <p className="text-micro text-gray-500 uppercase font-bold tracking-wider">
              Session Management
            </p>
          </div>
        </div>

        <button
          onClick={toggleAutoLogout}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none 
            ${autoLogout ? "bg-green-700" : "bg-gray-200"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 
              ${autoLogout ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-app-light rounded-2xl border border-app-dark/5">
          <p className="text-sm-text font-medium text-text-dark leading-snug">
            Automatically log out after 30 minutes of tab inactivity.
          </p>
          <p className="text-micro text-gray-400 mt-1 italic">
            *Recommended for shared shop computers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionSecurity;