import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  IconStatusReady, 
  IconInfo 
} from "../icons"; 
import { printThermalReceipt } from "../orders/receiptService";
import { useNotificationStore } from "../../store/ui/useNotificationStore";

const PrintTest = () => {
  const showNotification = useNotificationStore((state) => state.showNotification);
  const [isPrinting, setIsPrinting] = useState(false);

  // Mock data for the test receipt
  const testOrderData = {
    order_number: "TEST-000",
    customer_name: "TEST CUSTOMER",
    customer_phone: "09123456789",
    total_amount: 150.00,
    payment_method: "Cash",
    is_paid: true,
    services: [
      { service_name: "Wash & Fold (Test)", quantity: 5, subtotal: 125.00 },
      { service_name: "Fabric Softener", quantity: 1, subtotal: 25.00 }
    ]
  };

  const handleTestPrint = () => {
    setIsPrinting(true);
    try {
      printThermalReceipt(testOrderData);
      showNotification("Test receipt sent to printer queue", "success");
    } catch (err) {
      showNotification("Print failed. Check connection.", "error");
    } finally {
      // Small timeout to give the UI a chance to show the "Printing" state
      setTimeout(() => setIsPrinting(false), 2000);
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
        Verify your Bluetooth, Wi-Fi, or USB Thermal Printer connection here.
      </p>

      <div className="space-y-4">
        {/* Instruction Alert */}
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <div className="flex gap-3">
            <IconInfo className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Ensure your printer is <strong>paired</strong> first. For 58mm thermal printers, set margins to <strong>None</strong> and Scale to <strong>100%</strong> in the print dialog.
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
              : "bg-app-dark text-white hover:shadow-lg"
          }`}
        >
          {isPrinting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            "Print Test Receipt"
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default PrintTest;