import { useEffect, useState } from "react";
import "../style/modal-style/LoginPopup.css";

// Configuration Constants
const PROGRESS_INTERVAL_MS = 50;
const PROGRESS_DECREMENT_STEP = 2.5;

// Icons
const POPUP_ICONS = {
  success: (color) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill={color} className="me-2" viewBox="0 0 16 16">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
      <path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05" />
    </svg>
  ),
  error: (color) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill={color} className="me-2" viewBox="0 0 16 16">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 0 0 8 0a8 8 0 0 0 0 16" />
      <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z" />
    </svg>
  ),
  close: (color) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" fill={color} viewBox="0 0 16 16">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
    </svg>
  ),
};

export function LoginPopup({ message, type = "info", onClose }) {
  const [progress, setProgress] = useState(100);

  // Set colors: Green for success, Red for everything else
  const themeColor = type === "success" ? "green" : "red";

  useEffect(() => {
  if (!message) return;

  setProgress(100);

  const interval = setInterval(() => {
    // 1. We check the current value by moving logic out of the functional updater
    setProgress((prevProgress) => {
      const nextProgress = prevProgress - PROGRESS_DECREMENT_STEP;
      return nextProgress;
    });
  }, PROGRESS_INTERVAL_MS);

  return () => clearInterval(interval);
}, [message]); // Removed onClose from here to avoid unnecessary resets

// 2. Separate Effect to handle closing when progress hits 0
useEffect(() => {
  if (progress <= 0) {
    onClose();
  }
}, [progress, onClose]);

  if (!message) return null;

  return (
  <div
    /* FIXED POSITIONING: Centers at top-6 and handles its own width */
    className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999999] w-max max-w-[360px] px-4 pointer-events-none bg-transparent"
  >
   <div
  className={`pointer-events-auto relative bg-white  border rounded-xl overflow-hidden transition-all duration-300 ${
    type === "success" 
      ? "border-status-complete" 
      : "border-red-600"
  }`}
  role="alert"
>
      
      {/* --- CLOSE BUTTON: Absolute positioned in the corner --- */}
      <button
        className="absolute top-1 right-1 p-1 rounded-lg  focus:outline-none opacity-70 hover:opacity-90 "
        aria-label="Close"
        onClick={onClose}
      >
        {POPUP_ICONS.close(themeColor)}
      </button>

      {/* --- MESSAGE CONTENT: Flex centered with padding --- */}
      <div className="px-6 py-3 flex items-center justify-center gap-3">
        <div className="shrink-0">
          {type === "success" ? POPUP_ICONS.success(themeColor) : POPUP_ICONS.error(themeColor)}
        </div>
        <span 
          style={{ color: themeColor }} 
          className="font-normal text-base-text leading-tight !mr-3"
        >
          {message}
        </span>
      </div>

     

    </div>
  </div>
);
}