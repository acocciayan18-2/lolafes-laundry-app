// src/services/smsService.js

export const sendStatusSMS = (phone, name, orderNumber, status) => {
  if (!phone) return;

const message = `Hi ${name}! Great news! Your laundry order #${orderNumber} is now ${status.toUpperCase()}. It's ready for handover at your convenience. Thank you! - Lola Fe's Laundry`;
  // Encode message for URL (handles spaces, symbols, etc.)
  const encodedMessage = encodeURIComponent(message);
  
  // Check if it's an iOS device for the correct separator
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';

  const smsUrl = `sms:${phone}${separator}body=${encodedMessage}`;

  // Redirect to the system's messaging app
  window.location.href = smsUrl;
};