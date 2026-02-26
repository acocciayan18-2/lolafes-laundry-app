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
      element: "#step-unclaimed-orders", // NEW STEP INCLUDED
      popover: {
        title: "🚨 Overdue Pickups",
        description:
          "Track orders that have been ready for too long. You can claim them here.",
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

    {
      element: "#step-customer-card-0", // Target the first card or dummy
      popover: {
        title: "📇 Customer Details",
        description:
          "Each card shows contact info and address for easy reference.",
      },
    },
    {
      element: "#step-customer-actions-0", // Target the ellipses button
      popover: {
        title: "⚙️ Quick Actions",
        description:
          "Click the ellipses to edit details or remove a customer from the record.",
        nextBtnText: "Finish",
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
    {
      element: "#step-service-card-0", // Target the first card or dummy
      popover: {
        title: "🧺 Manage Rates",
        description:
          "Update your per-kilo pricing or temporarily disable services during peak hours.",
        nextBtnText: "Finish",
      },
    },
  ],

  // src/tours/globalTours.js

  reports: [
    {
      element: "#step-reports-header",
      popover: {
        title: "📈 Business Analytics",
        description:
          "Welcome to your reports dashboard. Here you can track revenue, growth, and customer behavior.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#step-reports-kpi",
      popover: {
        title: "💰 Key Performance Indicators",
        description:
          "A quick summary of your total revenue, order count, and customer growth for the selected period.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "#step-reports-performance",
      popover: {
        title: "📊 Sales Performance",
        description:
          "Visualize your revenue trends over time to identify your busiest days and weeks.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "#step-reports-rush",
      popover: {
        title: "🔥 Rush Pulse",
        description:
          "Monitor peak hours and service demand to better manage your shop's workflow.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "#step-reports-mix",
      popover: {
        title: "🎯 Customer Mix",
        description:
          "See the breakdown of new vs. returning customers to measure loyalty.",
        side: "right",
        align: "center",
      },
    },
    {
      element: "#step-reports-top",
      popover: {
        title: "🏆 Top Customers",
        description:
          "Recognize your most loyal spenders and frequent visitors.",
        side: "left",
        align: "center",
      },
    },
    {
      element: ".shrink-0 button", // Targets the Export button inside the header
      popover: {
        title: "📥 Data Export",
        description:
          "Download your data as a CSV or PDF for external accounting and record-keeping.",
        side: "left",
        align: "center",
      },
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
