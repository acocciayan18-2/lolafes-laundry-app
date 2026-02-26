import { IconSettings } from "../components/icons";
import PrintTest from "../components/settings/PrintTest";
import SessionSecurity from "../components/settings/SessionSecurity"; // I

//TOUR
import { useLocation, useNavigate } from 'react-router-dom';
import { startGlobalTour } from '../tours/globalTours';

//Tour Logic 

 useEffect(() => {
  const searchParams = new URLSearchParams(location.search);
  const isTourActive = searchParams.get('tour') === 'active';
  
  // Also check if the store is still loading
  if (isTourActive && !isLoading) {
    // INCREASE the timeout. 400ms is often too fast for 
    // Framer Motion + Firebase data fetching.
    const timer = setTimeout(() => {
      console.log("Tour Triggered!"); // Check your console to see if this fires
      startGlobalTour(navigate);
    }, 1200); 

    return () => clearTimeout(timer);
  }
}, [location.search, isLoading]); // Added isLoading as a dependency

const Settings = () => {

  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-app-light p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-app-dark rounded-2xl shadow-lg">
            <IconSettings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-h2 text-text-dark font-bold">System Settings</h1>
            <p className="text-sm-text text-gray-500">Configure your shop and hardware</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Hardware Block */}
          <PrintTest />

          {/* Session Security Block */}
          <SessionSecurity />
        </div>

      
</div>
      </div>
  );
};

export default Settings;