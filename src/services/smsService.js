// src/services/smsService.js

export const sendStatusSMS = (phone, name, orderNumber, status) => {
  if (!phone) return;

const message = `Hi ${name}! Good news! Your laundry order #${orderNumber} is now ${status}. It's ready for handover at your convenience. Thank you! - Lola Fe's Laundry`;
  
  const encodedMessage = encodeURIComponent(message);
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';

  const smsUrl = `sms:${phone}${separator}body=${encodedMessage}`;

  window.location.href = smsUrl;
};