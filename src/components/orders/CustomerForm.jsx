import React, { useState } from "react";
import { IconUsers, IconSearch, IconUserPlus } from "../icons";

export const CustomerForm = ({
  customer,
  setCustomer,
  selectedCustomerId,
  setSelectedCustomerId,
  allCustomers,
  Button,
  Input,
}) => {
  const [showExistingCustomers, setShowExistingCustomers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers =
    allCustomers?.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    ) || [];

  const selectCustomer = (c) => {
    setCustomer({ name: c.name, phone: c.phone, address: c.address || "" });
    setSelectedCustomerId(c.id);
    setShowExistingCustomers(false); 
  };

  const getIconClasses = (isActive) => {
    return `w-5 h-5 mr-2 transition-colors duration-200 ${
      isActive ? "!text-white !stroke-white" : "!text-gray-500 !stroke-gray-500"
    }`;
  };

  const isExistingActive = showExistingCustomers || selectedCustomerId !== null;
  const isAddNewActive = !showExistingCustomers && selectedCustomerId === null;

  /**
   * FINAL FOCUS LOGIC:
   * 1. focus:outline-none -> Removes default browser outline
   * 2. focus:ring-offset-0 -> REMOVES THE WHITE GAP/BORDER
   * 3. focus:!border-[#2d79f3] -> Brand Blue Border
   * 4. focus:!ring-2 -> Soft Glow
   */
   const focusClasses = "focus:outline-none focus:!ring-0 focus:!shadow-none focus:!border-[#2d79f3] border-gray-300";

  return (
    <div className="bg-white/80 rounded-xl shadow-[rgba(50,50,93,0.15)_0px_50px_100px_-20px,rgba(0,0,0,0.1)_0px_30px_60px_-30px] border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-0 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <IconUsers className="w-6 h-6 !text-[#2d79f3] !stroke-[#2d79f3]" />
            Customer Information
          </h3>
          
          {selectedCustomerId && (
            <span className="px-3 py-1 rounded-full text-xxs font-black bg-green-100 text-green-800 ">
              Existing Customer
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-2">
        <div className="flex gap-2 pb-2">
          <Button
            variant={isExistingActive ? "default" : "outline"}
            size="md"
            onClick={() => setShowExistingCustomers(true)}
            className="text-base transition-all !px-4"
          >
            <IconSearch className={getIconClasses(isExistingActive)} />
            Select Existing
          </Button>

          <Button
            variant={isAddNewActive ? "default" : "outline"}
            size="md"
            onClick={() => {
              setShowExistingCustomers(false);
              setSelectedCustomerId(null);
              setCustomer({ name: "", phone: "", address: "" });
            }}
            className="text-base transition-all !px-4"
          >
            <IconUserPlus className={getIconClasses(isAddNewActive)} />
            Add New
          </Button>
        </div>

        {showExistingCustomers ? (
          <div className="space-y-3">
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={focusClasses}
            />

            <div className="max-h-40 overflow-y-auto bg-gray-50/50 rounded-xl p-1 border border-gray-100 custom-scrollbar">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full text-left p-3 rounded-lg transition-colors hover:bg-blue-50 group"
                  >
                    <p className="font-bold text-gray-900 group-hover:text-[#2d79f3] transition-colors">{c.name}</p>
                    <p className="text-sm text-gray-500">{c.phone}</p>
                  </button>
                ))
              ) : (
                <p className="text-center text-sm text-gray-400 py-10 italic">
                  No customers found
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Customer Name *"
                value={customer.name}
                readOnly={!!selectedCustomerId}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    name: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Enter Customer Name"
                className={`uppercase ${selectedCustomerId ? "focus:outline-none bg-gray-50 cursor-not-allowed text-gray-500 border-gray-200" : focusClasses}`}
              />
              <Input
                label="Contact Number *"
                value={customer.phone}
                readOnly={!!selectedCustomerId}
                onChange={(e) =>
                  setCustomer({ ...customer, phone: e.target.value })
                }
                placeholder="09XX XXX XXXX"
                className={`${selectedCustomerId ? "focus:outline-none bg-gray-50 cursor-not-allowed text-gray-500 border-gray-200" : `text-gray-900 ${focusClasses}`}`}
              />
            </div>
            <Input
              label="Address"
              value={customer.address}
              readOnly={!!selectedCustomerId}
              onChange={(e) =>
                setCustomer({ ...customer, address: e.target.value })
              }
              placeholder="Customer Address (Optional)"
              className={`${selectedCustomerId ? "focus:outline-none bg-gray-50 cursor-not-allowed text-gray-500 border-gray-200" : focusClasses}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};