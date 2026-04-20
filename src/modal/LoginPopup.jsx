import { useEffect, useState, useCallback } from "react";
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

  const themeColor = type === "success" ? "green" : "red";

 

  // Reset and start countdown whenever a new message appears
  useEffect(() => {
    if (!message) return;

    setProgress(100);

    const interval = setInterval(() => {
      setProgress((prev) => prev - PROGRESS_DECREMENT_STEP);
    }, PROGRESS_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [message]);

  // Close only once when progress first crosses 0
const handleClose = useCallback(() => {
  if (typeof onClose === 'function') onClose();
}, [onClose]);

useEffect(() => {
  if (progress <= 0) handleClose();
}, [progress, handleClose]);
  if (!message) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999999] w-max max-w-[360px] px-4 pointer-events-none bg-transparent">
      <div
        className={`pointer-events-auto relative bg-white border rounded-xl overflow-hidden transition-all duration-300 ${
          type === "success"
            ? "border-status-complete"
            : "border-rose-600"
        }`}
        role="alert"
      >

        {/* --- CLOSE BUTTON --- */}
        <button
          className="absolute top-1 right-1 p-1 rounded-lg focus:outline-none opacity-70 hover:opacity-90"
          aria-label="Close"
          onClick={handleClose}
        >
          {POPUP_ICONS.close(themeColor)}
        </button>

        {/* --- MESSAGE CONTENT --- */}
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