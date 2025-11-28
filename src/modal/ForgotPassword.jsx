import React from "react";

// ----------------------------------------------------------------------
// CONSTANTS & HELPERS
// Standard: Naming Convention (Constants -> UPPER_SNAKE_CASE)
// Standard: DRY Principle (Reusable logic/assets)
// ----------------------------------------------------------------------

const EMAIL_VALIDATION_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UI_ICONS = {
  close: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle me-2 flex-shrink-0 mr-2 mt-1" viewBox="0 0 16 16">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
      <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />
    </svg>
  ),
  atSymbol: (
    <svg xmlns="http://www.w3.org/2000/svg" width="1.4rem" height="1.4rem" fill="currentColor" className="bi bi-at absolute left-3 text-gray-500" viewBox="0 0 16 16">
      <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914" />
    </svg>
  ),
};

/**
 * Validates if the provided string is a valid email format.
 * Standard: Security Practices (Validate inputs)
 */
const isValidEmail = (email) => {
  return EMAIL_VALIDATION_REGEX.test(email);
};

// ----------------------------------------------------------------------
// COMPONENT
// Standard: Documentation Requirements
// ----------------------------------------------------------------------

/**
 * ForgotPassword Component
 * Displays a modal popup allowing the user to request a password reset link.
 *
 * @param {string} resetEmail - The current value of the email input.
 * @param {function} setResetEmail - State setter for the email input.
 * @param {boolean} resetLoading - Loading state during the API call.
 * @param {function} handleForgotPassword - Function to trigger the reset password action.
 * @param {function} setShowForgotPopup - Function to toggle the visibility of this modal.
 */
export default function ForgotPassword({
  resetEmail,
  setResetEmail,
  resetLoading,
  handleForgotPassword,
  setShowForgotPopup,
}) {
  
  // Derived state for button validation
  const isInputValid = isValidEmail(resetEmail);
  const isButtonDisabled = resetLoading || !isInputValid;

  /**
   * Closes the modal and clears the email state.
   * Standard: Descriptive Naming
   */
  const handleClose = () => {
    setShowForgotPopup(false);
    setResetEmail("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          {UI_ICONS.close}
        </button>

        <h4 className="text-xl font-bold mb-3">Reset Password</h4>

        {/* Info Text */}
        <p className="small text-muted flex items-start text-sm text-gray-500 mb-3">
          {UI_ICONS.info}
          Only fully registered admin accounts will receive a password reset link.
        </p>

        {/* Email Input Field */}
        <div className="mb-3 text-start">
          <label htmlFor="email" className="block text-gray-700 font-medium mb-1">
            Email
          </label>
          <div className="relative flex items-center mb-2">
            {UI_ICONS.atSymbol}
            <input
              type="email"
              id="email"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your Email"
              required
              autoComplete="off"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handleForgotPassword}
            disabled={isButtonDisabled}
            className={`px-4 py-2 rounded-md font-medium text-white transition-colors duration-200 ${
              isButtonDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            }`}
          >
            {resetLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </div>
      </div>
    </div>
  );
}