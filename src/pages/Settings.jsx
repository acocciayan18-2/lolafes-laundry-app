import { IconSettings } from "../components/icons";
import PrintTest from "../components/settings/PrintTest";
import SessionSecurity from "../components/settings/SessionSecurity";
import AutoPrintToggle from "../components/settings/AutoPrintToggle";
import ReceiptConfiguration from "../components/settings/ReceiptConfiguration"; // New Import

const Settings = () => {
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

        {/* SETTINGS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* 1. Branding & Receipts (Full Width for Preview) */}
          <div className="md:col-span-2">
             <ReceiptConfiguration />
          </div>

          {/* 2. Hardware & Testing */}
          <PrintTest />

          {/* 3. Automation & Printing Logic */}
          <AutoPrintToggle />

          {/* 4. Session & Security (Full Width) */}
          <div className="md:col-span-2">
             <SessionSecurity />
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Settings;