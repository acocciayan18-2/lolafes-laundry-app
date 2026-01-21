import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useCustomerStore } from "../../store/customer/useCustomerStore";
import { IconSearch, IconUserPlus, IconUsers } from "../icons";

import "../../style/custom-scrollbar.css";

export const CustomerForm = ({
  customer,
  setCustomer,
  selectedCustomerId,
  setSelectedCustomerId,
  Button,
  Input,
  isSubmitting
}) => {
  const [showExistingCustomers, setShowExistingCustomers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { customers, subscribeToCustomers, isLoading } = useCustomerStore();
  
  useEffect(() => {
    const unsubscribe = subscribeToCustomers();
    return () => unsubscribe();
  }, [subscribeToCustomers]);

  const duplicateCustomer = useMemo(() => {
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
    return `w-4 h-4 mr-2 transition-colors duration-200 ${
      isActive ? "!text-app-light !stroke-app-light" : "!text-app-dark !stroke-app-dark"
    }`;
  };

  const isExistingActive = showExistingCustomers || selectedCustomerId !== null;
  const isAddNewActive = !showExistingCustomers && selectedCustomerId === null;
  const focusClasses = "focus:outline-none focus:!ring-0 focus:!shadow-none focus:!border-app-dark/70 border-gray-300";

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
    >
      <div className="p-4 pb-0 ">
        <div className="flex flex-wrap items-center gap-2">
          {/* SECTION HEADER: text-h3 */}
          <h3 className="flex items-center gap-2 text-h3 font-bold text-text-dark">
            <IconUsers className="w-6 h-6 !text-app-dark !stroke-app-dark" />
            Customer Information
          </h3>
            
          <AnimatePresence>
            {selectedCustomerId && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                // BADGE: text-nano
                className="px-3 py-1 rounded-full text-micro font-bold bg-green-100 text-green-800  "
              >
                Existing Customer
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex gap-2 pb-1">
          <Button
            variant={isExistingActive ? "default" : "outline"}
            // BUTTON TEXT: text-base-text via component internal size logic
            size="md"
            onClick={() => setShowExistingCustomers(true)}
            className="transition-all !px-4"
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
            className="transition-all !px-4"
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
                  // INPUT TEXT: text-sm-text
                  className={`text-sm-text ${focusClasses}`}
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
                        {/* RESULT NAME: text-base-text */}
                        <p className="text-base-text font-bold text-gray-900 group-hover:text-btn-primary transition-colors">{c.name}</p>
                        {/* RESULT PHONE: text-sm-text */}
                        <p className="text-sm-text text-gray-500">{c.phone}</p>
                      </button>
                    ))
                  ) : (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-micro text-gray-400 py-10 font-normal"
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
  // LABEL: text-nano via component
  label="Customer Name"
  value={customer.name}
  id="customer-name"
  readOnly={!!selectedCustomerId}
  onChange={(e) => {
    // Regex to capitalize the first letter of every word
    const capitalizedName = e.target.value.replace(/(^\w|\s\w)/g, (match) => 
      match.toUpperCase()
    );

    setCustomer({
      ...customer,
      name: capitalizedName,
    });
  }}
  placeholder="Enter Customer Name"
  // VALUE: text-sm-text
  className={`text-sm-text ${
    selectedCustomerId 
      ? "focus:outline-none bg-gray-50 cursor-not-allowed text-gray-700 border-gray-200" 
      : focusClasses
  }`}
/>
                  <div className="flex flex-col relative">
                   <Input
  type="tel" // Triggers the telephone keypad
  inputMode="numeric" // Forces the numeric-only keyboard on most mobile browsers
  pattern="[0-9]*" // Added for older iOS compatibility
  label="Contact Number"
  value={customer.phone}
  id="customer-phone"
  readOnly={!!selectedCustomerId}
  onChange={(e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('9')) val = '0' + val;
    if (val.length > 11) val = val.slice(0, 11);
    setCustomer({ ...customer, phone: val });
  }}
  placeholder="09XX XXX XXXX"
  className={`text-sm-text ${selectedCustomerId ? "focus:outline-none bg-gray-50 cursor-not-allowed text-gray-700 border-gray-200" : `text-gray-900 ${focusClasses}`} ${(isPhoneDuplicate || (customer.phone.length === 11 && !customer.phone.startsWith("09"))) ? "!border-red-500 !text-red-600 !bg-red-50" : ""}`}
/>
                    
                    <div className="space-y-1">
                      <AnimatePresence>
                        {isPhoneDuplicate && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            {/* ERROR: text-micro */}
                            <span className="font-bold text-red-600 text-micro ml-1 ">
                              Number already exists!
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {!isPhoneDuplicate && customer.phone.length === 11 && !customer.phone.startsWith("09") && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <span className="font-bold text-red-600 text-micro">
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
  onChange={(e) => {
    const capitalizedValue = e.target.value.replace(/(^\w|\s\w)/g, (match) => 
      match.toUpperCase()
    );
    
    setCustomer({ ...customer, address: capitalizedValue });
  }}
  placeholder="Customer Address (Optional)"
  className={`text-sm-text ${
    selectedCustomerId 
      ? "capitalize focus:outline-none bg-gray-50 cursor-not-allowed text-gray-700 border-gray-200" 
      : focusClasses
  }`}
/>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};