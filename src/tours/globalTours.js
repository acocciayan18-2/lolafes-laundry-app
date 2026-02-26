// src/tours/globalTours.js
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startGlobalTour = (navigate, setIsTourActive, startIndex = 0) => {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    popoverClass: 'lola-fes-tour-theme',
    onDestroyed: () => {
      // SAFETY CHECK: Only call if it's actually a function
      if (typeof setIsTourActive === 'function') {
        setIsTourActive(false);
      }
      localStorage.removeItem('isTourRunning');
    },
    steps: [
      /* --- DASHBOARD STEPS --- */
      { 
        element: '#step-intelligence', 
        popover: { title: '✨ Intelligence', description: 'Real-time alerts for your shop.' } 
      },
      { 
        element: '#step-stats', 
        popover: { title: '📊 Counters', description: 'Monitor bag counts.' } 
      },
      {
        element: '#step-actions', 
        popover: {
          title: '🚀 Create Orders',
          description: 'Click Next to head over to the New Order page.',
          nextBtnText: 'Go to New Order' 
        },
        onNextClick: () => {
          localStorage.setItem('isTourRunning', 'true');
          
          // SAFETY CHECK: Reveal loyalty card for the next page
          if (typeof setIsTourActive === 'function') {
            setIsTourActive(true);
          }
          
          navigate('/main/neworder?tour=active'); 
          driverObj.destroy();
        }
      },

      /* --- NEW ORDER STEPS --- */
      { element: '#step-customer', popover: { title: 'Customer', description: 'Enter details.' } },
      { element: '#step-loyalty', popover: { title: 'Loyalty', description: 'Rewards.' } },
      { element: '#step-summary', popover: { title: 'Summary', description: 'Finalize order.' } }
    ]
  });

  driverObj.drive(startIndex);
};