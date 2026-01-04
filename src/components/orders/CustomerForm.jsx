import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconUsers, IconSearch, IconUserPlus } from "../icons";
import { useCustomerStore } from "../../store/customer/useCustomerStore";
// REMOVED: useNewOrderStore import is no longer needed here
// We rely on the prop from the parent to control timing

import "../../style/custom-scrollbar.css";

export const CustomerForm = ({
  customer,
  setCustomer,
  selectedCustomerId,
  setSelectedCustomerId,
  Button,
  Input,
  isSubmitting // <--- 1. ACCEPT THIS PROP
}) => {
  const [showExistingCustomers, setShowExistingCustomers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { customers, subscribeToCustomers, isLoading } = useCustomerStore();
  
  useEffect(() => {
    const unsubscribe = subscribeToCustomers();
    return () => unsubscribe();
  }, [subscribeToCustomers]);

  // --- DUPLICATE LOGIC ---
  const duplicateCustomer = useMemo(() => {
    // 2. USE THE PROP HERE
    // Since the parent component (NewOrder) keeps isProcessing=true until navigation,
    // this check will return null and hide the error successfully.
    if (isSubmitting || selectedCustomerId || customer.phone.length < 4) return null;
    
    return customers.find(c => {
      const dbPhoneClean = String(c.phone || "").replace(/\D/g, "");
      const inputPhoneClean = String(customer.phone || "").replace(/\D/g, "");
      return dbPhoneClean === inputPhoneClean;
    });
  }, [customers, customer.phone, selectedCustomerId, isSubmitting]); 

  const isPhoneDuplicate = !!duplicateCustomer;

  const filteredCustomers = customers?.filter(
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
  const focusClasses = "focus:outline-none focus:!ring-0 focus:!shadow-none focus:!border-[#2d79f3] border-gray-300";

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 rounded-xl shadow-md border border-gray-100 overflow-hidden"
    >
      <div className="p-4 pb-0 ">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <IconUsers className="w-6 h-6 !text-[#2d79f3] !stroke-[#2d79f3]" />
            Customer Information
          </h3>
           
          <AnimatePresence>
            {selectedCustomerId && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="px-3 py-1 rounded-full text-[12px] font-bold  bg-green-100 text-green-800"
              >
                Existing Customer
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-4 space-y-2">
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

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            {showExistingCustomers ? (
              <motion.div 
                key="existing"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <Input
                  placeholder={isLoading ? "Loading customers..." : "Search by name or phone..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={focusClasses}
                  disabled={isLoading}
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
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm text-gray-400 py-10 italic"
                    >
                      {isLoading ? "Fetching cloud data..." : "No customers found"}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="new"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 pt-1"
              >
                <div className="grid md:grid-cols-2 gap-2">
                  <Input
                    label="Customer Name"
                    value={customer.name}
                    id="customer-name"
                    readOnly={!!selectedCustomerId}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        name: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Enter Customer Name"
                    className={`uppercase ${selectedCustomerId ? "focus:outline-none bg-gray-50 cursor-not-allowed text-gray-400 border-gray-200" : focusClasses}`}
                  />
               <div className="flex flex-col relative">
  <Input
    label="Contact Number"
    value={customer.phone}
    id="customer-phone"
    readOnly={!!selectedCustomerId}
    onChange={(e) => {
      // 1. Clean input
      let val = e.target.value.replace(/\D/g, '');

      // 2. Auto-fix: If starts with '9', add '0' prefix
      if (val.startsWith('9')) {
        val = '0' + val;
      }

      // 3. Limit to 11 characters
      if (val.length > 11) {
        val = val.slice(0, 11);
      }

      setCustomer({ ...customer, phone: val });
    }}
    placeholder="09XX XXX XXXX"
    // VISUAL FIX: Only turn red if Duplicate OR (Length is 11 AND format is wrong)
    className={`${selectedCustomerId ? "focus:outline-none bg-gray-50 cursor-not-allowed text-gray-400 border-gray-200" : `text-gray-900 ${focusClasses}`} ${(isPhoneDuplicate || (customer.phone.length === 11 && !customer.phone.startsWith("09"))) ? "!border-red-500 !text-red-600 !bg-red-50" : ""}`}
  />
  
  {/* Error Messages Container */}
  <div className="space-y-1 mt-1">
    
    {/* 1. Duplicate Error */}
    <AnimatePresence>
      {isPhoneDuplicate && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <span className="font-bold text-red-600 text-[11px] ml-1">
            Number already exists!
          </span>
        </motion.div>
      )}
    </AnimatePresence>

    {/* 2. Invalid Format Error - ONLY shows when length reaches 11 */}
    <AnimatePresence>
      {!isPhoneDuplicate && customer.phone.length === 11 && !customer.phone.startsWith("09") && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <span className="font-bold text-red-600 text-[11px]">
            Format must be 09XXXXXXXXX
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
</div>
                </div>
                <Input
                  label="Address"
                  id="customer-address"
                  value={customer.address}
                  readOnly={!!selectedCustomerId}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                  placeholder="Customer Address (Optional)"
                  className={`${selectedCustomerId ? "focus:outline-none bg-gray-50 cursor-not-allowed text-gray-400 border-gray-200" : focusClasses}`}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};