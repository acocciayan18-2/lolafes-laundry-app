import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  IconStatusReady, 
  IconInfo,
  IconDelivery, // Representing Bluetooth/Wireless
  IconPackage    // Representing USB/Wired
} from "../icons"; 
import { silentPrint } from "../../services/printerService"; // Using the new silent logic
import { useNotificationStore } from "../../store/ui/useNotificationStore";

const PrintTest = () => {
  const showNotification = useNotificationStore((state) => state.showNotification);
  const [isPrinting, setIsPrinting] = useState(false);
  const [connectionType, setConnectionType] = useState("usb"); // Default to Wired

  // Mock data for the test receipt
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
      // Calling the direct hardware connection logic (No Popups)
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4 text-app-dark">
        <IconStatusReady className="w-5 h-5" />
        <h2 className="font-bold text-lg">Hardware & Printing</h2>
      </div>
      
      <p className="text-sm-text text-gray-600 mb-6">
        Test your <strong>Silent Printing</strong> logic. Select your connection and fire a test receipt without popups.
      </p>

      {/* CONNECTION SELECTOR */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setConnectionType("usb")}
          className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
            connectionType === "usb" 
              ? "border-app-dark bg-app-dark text-white shadow-md" 
              : "border-gray-100 text-gray-400 hover:border-gray-200"
          }`}
        >
          <IconPackage className="w-4 h-4" />
          <span className="text-xs font-bold uppercase">Wired (USB)</span>
        </button>

        <button
          onClick={() => setConnectionType("bluetooth")}
          className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
            connectionType === "bluetooth" 
              ? "border-blue-500 bg-blue-500 text-white shadow-md" 
              : "border-gray-100 text-gray-400 hover:border-gray-200"
          }`}
        >
          <IconDelivery className="w-4 h-4" />
          <span className="text-xs font-bold uppercase">Bluetooth</span>
        </button>

        <button
    onClick={() => setConnectionType("browser")}
    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-all ${
      connectionType === "browser" 
        ? "border-emerald-500 bg-emerald-500 text-white shadow-md" 
        : "border-gray-100 text-gray-400 hover:border-gray-200"
    }`}
  >
    <IconStatusReady className="w-4 h-4" />
    <span className="text-[10px] font-bold uppercase">WPS / PDF</span>
  </button>
      </div>

      <div className="space-y-4">
        {/* Instruction Alert */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <div className="flex gap-3">
            <IconInfo className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              The first time you print, your browser will ask you to <strong>pair</strong> the device. 
              Once paired, printing will be instant and silent.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleTestPrint}
          disabled={isPrinting}
          className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 ${
            isPrinting 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
              : connectionType === 'bluetooth' ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-app-dark text-white hover:shadow-lg"
          }`}
        >
          {isPrinting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending Data...
            </>
          ) : (
            `Print via ${connectionType === 'usb' ? 'USB' : 'Bluetooth'}`
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default PrintTest;