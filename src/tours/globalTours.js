import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// 1. Define steps for each page separately
const STEPS_BY_PAGE = {
  dashboard: [
    {
      element: "#step-intelligence",
      popover: {
        title: "✨ AI Insights",
        description: "Smart alerts for your shop.",
      },
    },
    {
      element: "#step-stats",
      popover: {
        title: "📊 Business Overview",
        description: "Monitor sales and laundry bags.",
      },
    },
    {
      element: "#step-today-orders",
      popover: {
        title: "📅 Today's Schedule",
        description: "View orders created today.",
      },
    },
    {
      element: "#step-activity",
      popover: {
        title: "🕒 Recent Activity",
        description: "History of shop updates.",
      },
    },
    {
      element: "#step-actions",
      popover: {
        title: "🚀 Create Orders",
        description: 'Click "Done" to finish the dashboard tour.',
        nextBtnText: "Done",
      },
    },
  ],
  neworder: [
    {
      element: "#step-customer",
      popover: {
        title: "👤 Customer Info",
        description: "Enter details or search regulars.",
      },
    },
    {
      element: "#step-loyalty",
      popover: {
        title: "🎁 Rewards System",
        description: "Check for earned free washes.",
      },
    },
    {
      element: "#step-services",
      popover: {
        title: "🧺 Select Services",
        description: "Choose Wash, Dry, or Fold.",
      },
    },
    {
      element: "#step-summary",
      popover: {
        title: "📝 Order Summary",
        description: "Review total and add notes.",
      },
    },
  ],
  orders: [
    {
      element: 'input[placeholder*="Search name"]',
      popover: { title: "🔍 Search", description: "Find orders quickly." },
    },
    {
      element: "#step-filters",
      popover: {
        title: "📅 Filtering",
        description: "Filter by status or date.",
      },
    },
    {
      element: "#step-order-card-0", // We will give the first card (or dummy) this ID
      popover: {
        title: "📦 Manage Order",
        description:
          "Click on a card to update status, print receipts, or edit details.",
      },
    },
  ],

  customers: [
    {
      element: "#customer-search-input",
      popover: {
        title: "👥 Customer List",
        description: "Manage your loyal base.",
      },
    },
    {
      element: "#step-cust-stats",
      popover: {
        title: "📈 Loyalty Stats",
        description: "Track top spenders.",
      },
    },
  ],
  services: [
    {
      element: "#step-add-service",
      popover: {
        title: "➕ Pricing",
        description: "Update rates or add services.",
      },
    },
    {
      element: "#step-loyalty-config",
      popover: {
        title: "🛠️ Reward Rules",
        description: "Set free wash rules.",
      },
    },
  ],
  reports: [
    {
      element: "#step-reports-kpi",
      popover: { title: "💰 Revenue", description: "Monitor daily income." },
    },
    {
      element: "#step-reports-performance",
      popover: { title: "📈 Growth", description: "Visualize performance." },
    },
  ],
};

export const startGlobalTour = (setIsTourActive) => {
  const path = window.location.pathname.toLowerCase();
  let pageKey = "";

  if (path.includes("dashboard")) pageKey = "dashboard";
  else if (path.includes("neworder")) pageKey = "neworder";
  else if (path.includes("orders")) pageKey = "orders";
  else if (path.includes("customers")) pageKey = "customers";
  else if (path.includes("services")) pageKey = "services";
  else if (path.includes("reports")) pageKey = "reports";

  const steps = STEPS_BY_PAGE[pageKey];
  if (!steps) return;

  const driverObj = driver({
    showProgress: true,
    animate: true,
    popoverClass: "lola-fes-tour-theme",
    allowClose: true,
    overlayColor: "rgba(0, 15, 45, 0.85)",
    onDestroyed: () => {
      if (typeof setIsTourActive === "function") setIsTourActive(false);
    },
    steps: steps,
  });

  driverObj.drive();
};
