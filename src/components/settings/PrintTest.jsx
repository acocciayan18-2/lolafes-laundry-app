import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  IconStatusReady, 
  IconInfo,
  IconDelivery, 
  IconPackage
} from "../icons"; 
import { silentPrint } from "../../services/printerService";
import { useNotificationStore } from "../../store/ui/useNotificationStore";

const PrintTest = () => {
  const showNotification = useNotificationStore((state) => state.showNotification);
  const [isPrinting, setIsPrinting] = useState(false);
  const [connectionType, setConnectionType] = useState("usb");

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
    ]
  };

  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      const result = await silentPrint(testOrderData, connectionType);
      
      if (result.success) {
        showNotification(`Test receipt sent via ${connectionType.toUpperCase()}`, "success");
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
    <div 
      
      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4 text-app-dark">
        <h2 className="font-bold text-h3">Hardware & Printing</h2>
      </div>
      
      <p className="text-sm-text text-gray-600 mb-6">
        Test your <strong>Printing</strong> logic. Select your connection and fire a test receipt.
      </p>

      {/* CONNECTION SELECTOR */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={() => setConnectionType("usb")}
          className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
            connectionType === "usb" 
              ? "border-app-dark shadow-md" 
              : "border-gray-100 text-gray-400 hover:border-gray-200"
          }`}
        >
          <IconPackage className="w-4 h-4" />
          <span className="text-sm-text ">Wired (USB)</span>
        </button>

        <button
          onClick={() => setConnectionType("bluetooth")}
          className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
            connectionType === "bluetooth" 
              ? "border-app-dark shadow-md" 
              : "border-gray-100 text-gray-400 hover:border-gray-200"
          }`}
        >
          <IconDelivery className="w-4 h-4" />
          <span className="text-sm-text ">Bluetooth</span>
        </button>

        <button
          onClick={() => setConnectionType("browser")}
          className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
            connectionType === "browser" 
              ? "border-app-dark shadow-md" 
              : "border-gray-100 text-gray-400 hover:border-gray-200"
          }`}
        >
          <IconStatusReady className="w-4 h-4" />
          <span className="text-sm-text ">PDF</span>
        </button>
      </div>

      <div className="flex justify-end pt-2"> 
        <button
          onClick={handleTestPrint}
          disabled={isPrinting}
          className={`w-[170px] py-3 rounded-2xl font-normal text-sm-text active:scale-[0.97] hover:bg-app-dark/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
            isPrinting 
              ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
              : connectionType === 'bluetooth' 
                ? "bg-app-dark text-white hover:app-dark/90 shadow-lg shadow-slate-100" 
                : connectionType === 'browser'
                  ? "bg-app-dark text-white hover:app-dark/90 shadow-lg shadow-slate-100"
                  : "bg-app-dark text-white hover:shadow-lg shadow-slate-200"
          }`}
        >
          {isPrinting ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-[10px]">Sending...</span>
            </>
          ) : (
            `Print via ${connectionType === 'usb' ? 'USB' : connectionType === 'bluetooth' ? 'BT' : 'PDF'}`
          )}
        </button>
      </div>
    </div>
  );
};

export default PrintTest;