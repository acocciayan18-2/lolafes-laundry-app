import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startGlobalTour = (navigate, setIsTourActive, startIndex = 0) => {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    popoverClass: 'lola-fes-tour-theme',
    allowClose: true, 
    onDestroyed: () => {
      if (typeof setIsTourActive === 'function') setIsTourActive(false);
    },
    steps: [
      /* --- [0-4] DASHBOARD --- */
      { element: '#step-intelligence', popover: { title: '✨ AI Insights', description: 'This ticker shows smart alerts, like which customers are due for a visit.' } },
      { element: '#step-stats', popover: { title: '📊 Business Overview', description: 'Monitor your total sales, pending bags, and laundry ready for pickup here.' } },
      { element: '#step-today-orders', popover: { title: '📅 Today\'s Schedule', description: 'A quick view of all orders created today and their current status.' } },
      { element: '#step-activity', popover: { title: '🕒 Recent Activity', description: 'Check the live history of status updates and new orders in the shop.' } },
      { 
        element: '#step-actions', 
        popover: { 
          title: '🚀 Create Orders', 
          description: 'Ready to start? Let\'s go to the New Order page to create your first transaction.', 
          nextBtnText: 'Go to New Order' 
        }, 
        onNextClick: () => {
          driverObj.destroy();
          setTimeout(() => navigate('/main/neworder?tour=active'), 100);
        } 
      },

      /* --- [5-9] NEW ORDER --- */
      { element: '#step-customer', popover: { title: '👤 Customer Info', description: 'Type a name or phone number. If they are a regular, their details will auto-fill.' } },
      { element: '#step-loyalty', popover: { title: '🎁 Rewards System', description: 'Once a customer is selected, you can see if they earned a free wash here.' } },
      { element: '#step-services', popover: { title: '🧺 Select Services', description: 'Choose between Wash, Dry, or Fold and enter the weight in kilograms.' } },
      { element: '#step-summary', popover: { title: '📝 Order Summary', description: 'Review the total amount, add notes, and mark as paid or unpaid.' } },
      { 
        element: '#step-summary button[type="submit"]',
        popover: { 
          title: '✅ Finalize', 
          description: 'Clicking submit saves the order. Let\'s check the full list now.', 
          nextBtnText: 'View All Orders' 
        },
        onNextClick: () => {
          driverObj.destroy();
          setTimeout(() => navigate('/main/orders?tour=active'), 100);
        }
      },

      /* --- [10-12] ORDERS LIST --- */
      { element: 'input[placeholder*="Search name"]', popover: { title: '🔍 Search & Find', description: 'Find any order quickly by name, phone number, or Order ID.' } },
      { element: '#step-filters', popover: { title: '📅 Advanced Filtering', description: 'Filter by status or date range.' } },
      { 
        element: '.group.flex.items-center.justify-center.w-9.h-9', 
        popover: { 
          title: '👥 Customers', 
          description: 'Let\'s look at your customer database next.', 
          nextBtnText: 'Go to Customers' 
        },
        onNextClick: () => {
          driverObj.destroy();
          setTimeout(() => navigate('/main/customers?tour=active'), 100);
        }
      },

      /* --- [13-14] CUSTOMERS --- */
      { element: '#customer-search-input', popover: { title: '👥 Customer List', description: 'Manage your loyal customer base here.' } },
      { 
        element: '#step-cust-stats', 
        popover: { 
          title: '📈 Loyalty Stats', 
          description: 'See your most frequent customers and their current points.', 
          nextBtnText: 'Manage Services' 
        },
        onNextClick: () => {
          driverObj.destroy();
          setTimeout(() => navigate('/main/services?tour=active'), 100);
        }
      },

      /* --- [15-16] SERVICES --- */
      { element: '#step-add-service', popover: { title: '➕ Pricing & Services', description: 'Update your rates or add new services.' } },
      { 
        element: '#step-loyalty-config', 
        popover: { 
          title: '🛠️ Reward Rules', 
          description: 'Set how many orders are needed for a free wash.', 
          nextBtnText: 'View Reports' 
        },
        onNextClick: () => {
          driverObj.destroy();
          setTimeout(() => navigate('/main/reports?tour=active'), 100);
        }
      },

      /* --- [17-19] REPORTS --- */
      { element: '#step-reports-kpi', popover: { title: '💰 Revenue Tracking', description: 'Monitor your daily and weekly income.' } },
      { element: '#step-reports-performance', popover: { title: '📈 Sales Growth', description: 'Visualize your shop\'s performance over time.' } },
      { 
        element: '#step-reports-top', 
        popover: { 
          title: '🏆 Success!', 
          description: 'You\'ve mastered the Lola Fe\'s Laundry system!', 
          nextBtnText: 'Finish Tour' 
        },
        onNextClick: () => {
          localStorage.setItem('lola_tour_done', 'true');
          driverObj.destroy();
          setTimeout(() => navigate('/main/dashboard'), 100);
        }
      }
    ]
  });

  driverObj.drive(startIndex);
};