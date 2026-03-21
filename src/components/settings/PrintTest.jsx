import { useState } from "react";
import { 
  IconStatusReady, 
  IconDelivery, 
  IconPackage,
  IconBluetooth,
  IconPdf,
  IconUsb
} from "../icons"; 
import { silentPrint } from "../../services/printerService";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { useSettingsStore } from "../../store/settings/useSettingsStore"; 
import { useActivityStore } from "../../store/activities/useActivityStore";

const PrintTest = () => {
  const showNotification = useNotificationStore((state) => state.showNotification);
  
  // Grab the settings and the update function
  const systemConfig = useSettingsStore((state) => state.systemConfig);
  const updateSystemConfig = useSettingsStore((state) => state.updateSystemConfig);
  const receiptConfig = useSettingsStore((state) => state.receiptConfig);
  
  // ✨ Grab the logActivity function
  const logActivity = useActivityStore((state) => state.logActivity);

  const [isPrinting, setIsPrinting] = useState(false);

  // Default to 'browser' if nothing is set in the database yet
  const activePrinter = systemConfig?.printerType || "browser";

  const testOrderData = {
    order_number: "TEST-000",
    customer_name: "TEST CUSTOMER",
    customer_phone: "09123456789",
    total_amount: 150.00,
    payment_method: "Cash",
    is_paid: true,
    services: [
      { service_name: "Wash & Fold (Test)", quantity: 5, total_amount: 125.00 },
      { service_name: "Fabric Softener", quantity: 1, total_amount: 25.00 }
    ],
    created_at: new Date()
  };

  const handleSetDefaultPrinter = async (type) => {
    try {
      await updateSystemConfig({ printerType: type });
      showNotification(`Default printer set to ${type.toUpperCase()}`, "success");
      
      await logActivity(
        "Printer settings updated",
        `Changed default printer connection to ${type.toUpperCase()}`,
        { type: "system_config", old_printer: activePrinter, new_printer: type }
      );

    } catch (err) {
      showNotification("Failed to save default printer.", "error");
    }
  };

  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      const result = await silentPrint(testOrderData, activePrinter, {
        ...receiptConfig,
        enableTracking: systemConfig?.enableOrderTracking
      });
      
      if (result.success) {
        showNotification(`Test receipt sent via ${activePrinter.toUpperCase()}`, "success");
        
        // ✨ Log the successful test print
        await logActivity(
          "system_test",
          "Hardware Test",
          `Successfully fired a test receipt via ${activePrinter.toUpperCase()} connection`,
          { type: "system_test", connection: activePrinter }
        );
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      showNotification(`Print failed: ${err.message || "Check connection"}`, "error");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-2 text-app-dark">
        <h2 className=" text-base-text font-bold">Hardware & Default Printer</h2>
      </div>
      
      <p className="text-micro text-gray-600 mb-6">
        Select the default printing method for the checkout counter, then fire a test receipt.
      </p>

      {/* CONNECTION SELECTOR */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => handleSetDefaultPrinter("usb")}
          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
            activePrinter === "usb" 
              ? "border-app-dark/80 shadow-md bg-slate-50" 
              : "border-gray-100 text-gray-400 hover:border-gray-200"
          }`}
        >
          <IconUsb className="w-4 h-4 text-text-dark opacity-90" />
          <span className="text-micro text-text-dark">Wired (USB)</span>
        </button>

        <button
          onClick={() => handleSetDefaultPrinter("bluetooth")}
          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
            activePrinter === "bluetooth" 
              ? "border-app-dark/80 shadow-md bg-slate-50" 
              : "border-gray-100 text-gray-400 hover:border-gray-200"
          }`}
        >
          <IconBluetooth className="w-4 h-4 text-text-dark opacity-90" />
          <span className="text-micro text-text-dark">Bluetooth</span>
        </button>

        <button
          onClick={() => handleSetDefaultPrinter("browser")}
          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
            activePrinter === "browser" 
              ? "border-app-dark/80 shadow-md bg-slate-50" 
              : "border-gray-100 text-gray-400 hover:border-gray-200"
          }`}
        >
          <IconPdf className="w-4 h-4 text-text-dark opacity-90" />
          <span className="text-micro text-text-dark">PDF / Native</span>
        </button>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-100 mt-2"> 
        <button
          onClick={handleTestPrint}
          disabled={isPrinting}
          className={`w-[170px] mt-4 py-3 rounded-2xl font-normal text-sm-text active:scale-[0.97] hover:bg-app-dark/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-app-dark text-white hover:shadow-lg shadow-slate-200`}
        >
          {isPrinting ? (
            <>
              <div className="w-3 h-3 border-1 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            `Test ${activePrinter === 'usb' ? 'USB' : activePrinter === 'bluetooth' ? 'Bluetooth' : 'PDF'}`
          )}
        </button>
      </div>
    </div>
  );
};

export default PrintTest;