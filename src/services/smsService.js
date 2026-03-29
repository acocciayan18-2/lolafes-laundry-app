// src/services/smsService.js

export const sendStatusSMS = (phone, name, orderNumber,  handoverMethod) => {
  if (!phone) return;

  const method = handoverMethod?.toLowerCase() === 'delivery' ? 'delivery' : 'pickup';

  const message = `Hi ${name}, your laundry order #${orderNumber} is now completed. It is now ready for ${method}. Thank you! - Lola Fe's Laundry`;
  
  const encodedMessage = encodeURIComponent(message);
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';

  const smsUrl = `sms:${phone}${separator}body=${encodedMessage}`;

  window.location.href = smsUrl;
};