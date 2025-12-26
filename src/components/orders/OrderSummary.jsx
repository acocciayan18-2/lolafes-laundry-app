import React from "react";
import { IconCalculator, IconSave } from "../icons"; // Adjust path if needed

export const OrderSummary = ({
  customer,
  selectedServices,
  notes,
  setNotes,
  paymentMethod,
  setPaymentMethod,
  onSubmit,
  isProcessing,
  Button,
}) => {
  // Calculations
  const total = selectedServices.reduce((sum, s) => sum + (s.subtotal || 0), 0);
  const totalWeight = selectedServices.reduce(
    (sum, s) => sum + (s.weight_kg || 0),
    0
  );

  return (
    <div className="bg-white rounded-2xl shadow-[rgba(50,50,93,0.15)_0px_50px_100px_-20px,rgba(0,0,0,0.1)_0px_30px_60px_-30px] border border-gray-200 overflow-hidden sticky top-6">
      {/* HEADER */}
      <div className="p-6 !pb-0">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          {/* Forced Green Icon using important modifiers */}
          <IconCalculator className="w-6 h-6 !text-green-700 !stroke-green-600" />
          Order Summary
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* CUSTOMER CARD (Light Blue Box) */}
        <div className="bg-blue-50/80 p-3 rounded-xl">
          <p className="text-sm font-medium text-gray-800 mb-1">Customer</p>
          {customer.name ? (
            <>
              <p className="text-l font-medium text-gray-900">
                {customer.name}
              </p>
              <p className="text-gray-600">{customer.phone}</p>
              {customer.address && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2 overflow-hidden text-ellipsis">
                  {customer.address}
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-400 italic text-sm">No customer selected</p>
          )}
        </div>

        {/* SERVICES LIST */}
        <div>
          <h4 className="font-bold text-gray-800 mb-3">
            Services ({selectedServices.length})
          </h4>

          <div className="space-y-2">
            {selectedServices.length > 0 ? (
              selectedServices.map((service, index) => (
  <div key={index} className="flex justify-between items-start">
    <div>
      <p className="font-bold text-gray-900 text-sm">{service.service_name}</p>
      <p className="text-sm text-gray-500">
        {service.weight_kg}kg × ₱{service.price_per_kg.toLocaleString()}
      </p>
    </div>
    <p className="font-bold text-gray-900">
      {/* Added toLocaleString for comma formatting */}
      ₱{service.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </p>
  </div>
))
            ) : (
              <p className="text-sm text-gray-400 italic">
                No services added yet.
              </p>
            )}
          </div>

          {/* Divider Line */}
          <div className="h-px bg-gray-200 my-4"></div>

          {/* TOTALS */}
          <div className="space-y-1">
            <p className="font-bold text-gray-900">
              Total Weight: {totalWeight}kg
            </p>
           <div className="flex justify-between items-center gap-1"> {/* Increased gap-4 to gap-8 for more breathing room */}
  <span className="font-bold text-green-700 text-lg leading-tight"> 
    {/* Removed max-w to allow it to use available space */}
    Total Amount:
  </span>
  <span className="font-bold text-green-700 text-2xl whitespace-nowrap">
    ₱{total.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}
  </span>
</div>
          </div>
        </div>

        {/* INPUTS SECTION */}
        <div className="space-y-2 ">
          {/* Special Instructions */}
          <div className="space-y-1">
            <label className="font-bold text-sm text-gray-800 pb-1">
              Special Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special notes..."
              className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none min-h-[80px] resize-none"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="font-bold text-sm text-gray-800 pb-1">
              Payment Method
            </label>
            <div className="relative">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-gray-300 text-gray-700 text-sm  outline-none appearance-none bg-white"
              >
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="card">Card</option>
              </select>
              {/* Custom Arrow Icon for Select */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 1L5 5L9 1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* BUTTON */}
        <Button
          onClick={onSubmit}
          disabled={
            isProcessing || selectedServices.length === 0 || !customer.name
          }
          className={`
    w-full h-12 text-base font-bold shadow-md border-0 rounded-lg mt-2 transition-all
    bg-gradient-to-b from-green-500 to-green-600 
    hover:from-green-600 hover:to-green-700
    !text-white 
    disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500
  `}
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <span className="flex items-center gap-2">
              {/* Forced White Icon */}
              <IconSave className="w-5 h-5 !text-white !stroke-white" />
              <p className="!text-white !font-normal">Place Order</p>
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
