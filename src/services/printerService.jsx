/**
 * @file printService.js
 * @description Enterprise-grade Hardware and Browser Print Orchestrator.
 * Implements ESC/POS encoding, WebUSB/WebBluetooth interfacing, and Auto-Print HTML rendering.
 * Now includes cryptographic HMAC-SHA256 tracking URLs.
 */

import EscPosEncoder from 'esc-pos-encoder';
// ✨ IMPORT CRYPTO TOOLS
import hmacSHA256 from 'crypto-js/hmac-sha256';
import Hex from 'crypto-js/enc-hex';

// ==========================================
// CONFIGURATION CONSTANTS
// ==========================================
const PRINTER_CONFIG = Object.freeze({
  BT_SERVICE_UUID: '000018f0-0000-1000-8000-00805f9b34fb',
  BT_CHARACTERISTIC_UUID: '00002af1-0000-1000-8000-00805f9b34fb',
});

// ✨ FIX: 30-character limit prevents line-wrapping on strict 58mm printers
const DASH_LINE = "------------------------------"; 

// ==========================================
// UTILITY HELPERS
// ==========================================

const sanitizeText = (text) => {
  if (!text) return "";
  return String(text).replace(/[<>]/g, '').trim().toUpperCase();
};

const formatMoney = (val) => {
  const num = Number(val);
  return isNaN(num) ? "0.00" : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatSafeDate = (dateSource) => {
  if (!dateSource) return "N/A";
  try {
    let date = dateSource;
    if (typeof dateSource === 'object' && 'seconds' in dateSource) {
      date = new Date(dateSource.seconds * 1000);
    } else if (typeof dateSource !== 'object') {
      date = new Date(dateSource);
    }
    if (isNaN(date.getTime())) return "INVALID DATE";
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).toUpperCase();
  } catch (e) {
    return "INVALID DATE";
  }
};

const checkHardwareSupport = (type) => {
  if (type === 'usb' && !navigator.usb) {
    throw new Error("WebUSB is not supported in this browser.");
  }
  if (type === 'bluetooth' && !navigator.bluetooth) {
    throw new Error("WebBluetooth is not supported in this browser.");
  }
  return true;
};

export const silentPrint = async (order, type, config) => {
  if (!order || typeof order !== 'object') {
    return { success: false, error: "Invalid order data provided for printing." };
  }

  const { 
    storeName = "LOLA FE'S LAUNDRY", 
    address = "", phone = "", email = "", website = "", 
    footerMessage = "THANK YOU FOR COMING!",
    showOrderDate = true, showPrintDate = true,
    enableTracking = true
  } = config || {};

  // --- DATA PREPARATION ---
  const orderDateLabel = formatSafeDate(order.created_at || order.created_date);
  const printDateLabel = formatSafeDate(new Date());
  
  const customerName = sanitizeText(order.customer_name || "WALK-IN CUSTOMER");
  const orderNumber = sanitizeText(order.order_number || "000000");
  
  const paymentMethod = sanitizeText(order.payment_method) || "CASH";
  
  const services = Array.isArray(order.services) ? order.services : [];
  const deliveryFee = Number(order.delivery_fee) || 0;
  const totalAmount = Number(order.total_amount) || 0;
  
  const isCash = paymentMethod.includes('CASH');
  const amountTendered = isCash && order.is_paid ? (Number(order.amount_tendered) || totalAmount) : null;
  const changeDue = isCash && order.is_paid ? (Number(order.change_due) || 0) : null;
  
  // ✨ GENERATE DYNAMIC SECURE TRACKING URL
  const safeId = orderNumber.toUpperCase();
  const secretKey = import.meta.env.VITE_TRACKING_SECRET || "lola-fe-super-secret-key-2026";
  const signature = hmacSHA256(safeId, secretKey).toString(Hex).substring(0, 8);
  
  const baseUrl = "https://customer-site-lolafes-laundry.vercel.app"; 
  const trackingUrl = `${baseUrl}/track/${safeId.toLowerCase()}/${signature}`;

  // ==========================================
  // HARDWARE PRINTER (USB / BLUETOOTH)
  // ==========================================
  if (type === 'usb' || type === 'bluetooth') {
    let device = null;
    let server = null;

    try {
      checkHardwareSupport(type);
      const encoder = new EscPosEncoder();
      let result = encoder.initialize().align('center');

      // Header Block
      result.size('large').line(sanitizeText(storeName)).size('normal');
      if (address) result.line(sanitizeText(address));
      if (phone) result.line(`TEL: ${sanitizeText(phone)}`);
      if (email) result.line(sanitizeText(email));
      if (website) result.line(sanitizeText(website));
      
      // Customer Block (Compact)
      result.line(DASH_LINE)
        .size('large').bold(true).line(customerName).bold(false).size('normal')
        .line(`ORDER ID: #${orderNumber}`)
        .line(DASH_LINE);

      // Timestamp Block
      if (showOrderDate) result.align('left').line(`ORDERED: ${orderDateLabel}`);
      if (showPrintDate) result.align('left').line(`PRINTED: ${printDateLabel}`);
      if (showOrderDate || showPrintDate) result.line(DASH_LINE);

      // Services Block
      services.forEach(s => {
        const sName = sanitizeText(s.service_name).substring(0, 18); 
        const sQty = String(s.quantity || s.weight_kg || 1);
        const sSub = `P${formatMoney(s.subtotal)}`;
        result.table(
          [{ width: 20, align: 'left' }, { width: 4, align: 'center' }, { width: 8, align: 'right' }],
          [[sName, sQty, sSub]]
        );
      });

      // Totals & Status Block
      result.line(DASH_LINE).align('left');
      
      // ✨ HARDWARE FIX: Make UNPAID a high-contrast inverted block
      if (order.is_paid) {
        result.line(`PAY METHOD: ${paymentMethod}`);
        result.line(`PAY STATUS: PAID`);
      } else {
        result.align('center')
              .invert(true).bold(true).line(" *** UNPAID *** ").bold(false).invert(false)
              .align('left');
      }

      if (deliveryFee > 0) result.line(`DELIVERY  : P${formatMoney(deliveryFee)}`);

      result.line(DASH_LINE)
        .align('right')
        .size('large').bold(true)
        .line(`TOTAL: P${formatMoney(totalAmount)}`)
        .size('normal').bold(false);

      if (isCash && order.is_paid && amountTendered !== null) {
        result.align('right')
          .line(`CASH  : P${formatMoney(amountTendered)}`)
          .line(`CHANGE: P${formatMoney(changeDue)}`);
      }

      // ✨ PRINT SECURE QR CODE TO HARDWARE PRINTER
      if (enableTracking) {
        result.align('center')
          .line(DASH_LINE)
          .line("SCAN TO TRACK ORDER")
          .qrcode(trackingUrl, 2, 6, 'm') 
          .line(trackingUrl.replace(/^https?:\/\//, ''))
      }

      // Footer Block 
      result.line(DASH_LINE).align('center').line(sanitizeText(footerMessage)).cut();
      
      const receiptData = result.encode();

      // Transmission
      if (type === 'usb') {
        device = await navigator.usb.requestDevice({ filters: [] });
        await device.open();
        if (device.configuration === null) await device.selectConfiguration(1);
        await device.claimInterface(0);
        await device.transferOut(1, receiptData);
      } else {
        device = await navigator.bluetooth.requestDevice({ filters: [{ services: [PRINTER_CONFIG.BT_SERVICE_UUID] }] });
        server = await device.gatt.connect();
        const service = await server.getPrimaryService(PRINTER_CONFIG.BT_SERVICE_UUID);
        const characteristic = await service.getCharacteristic(PRINTER_CONFIG.BT_CHARACTERISTIC_UUID);
        await characteristic.writeValue(receiptData);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`[Hardware Print Error - ${type}]:`, error);
      const msg = error.name === 'NotFoundError' ? 'Hardware selection cancelled by user.' 
                : error.name === 'SecurityError' ? 'Browser blocked hardware access.' 
                : error.message || "Hardware connection failed.";
      return { success: false, error: msg };
    } finally {
      try {
        if (type === 'usb' && device?.opened) await device.close();
        if (type === 'bluetooth' && server?.connected) server.disconnect();
      } catch (cleanupError) {
        console.warn("Failed to gracefully close printer connection:", cleanupError);
      }
    }
  }

  // ==========================================
  // BROWSER / PDF FALLBACK
  // ==========================================
  if (type === 'browser') {
    try {
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) throw new Error("Popup blocked! Please allow popups for this site.");
      
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trackingUrl)}`;

      const receiptHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>RECEIPT - ${customerName}</title>
            <style>
              body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 72mm; margin: 0 auto; padding: 5px; color: #000; 
                text-transform: uppercase; font-weight: bold; 
                line-height: 1.1; 
              }
              .center { text-align: center; }
              .line { border-top: 1px dashed black; margin: 6px 0; opacity: 50%; }
              .customer-name { font-size: 20px; font-weight: 900; margin: 2px 0; }
              .timestamp-box { font-size: 11px; margin: 2px 0; line-height: 1.2; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 2px; }
              td { padding: 1px 0; font-size: 13px; font-weight: bold; }
              .total-row { font-size: 21px; font-weight: 900; margin-top: 5px; text-align: right; }
              .cash-row { font-size: 14px; font-weight: bold; text-align: right; margin-top: 1px; }
              .payment-info { font-size: 12px; margin-top: 4px; }
              .header-info { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
              .qr-container { margin-top: 8px; text-align: center; }
              .qr-img { width: 120px; height: 120px; mix-blend-mode: multiply; }
              .qr-text { font-size: 10px; margin-top: 2px; text-transform: lowercase; font-weight: normal; word-break: break-all; }
              
              /* ✨ HTML FIX: Dynamic UNPAID badge mimicking hardware printer inversion */
              .unpaid-badge {
                background-color: #000;
                color: #fff;
                padding: 3px 8px;
                font-size: 13px;
                font-weight: 900;
                letter-spacing: 1px;
                border-radius: 2px;
                display: inline-block;
              }

              @media print { 
                @page { margin: 0; }
                body { padding: 0; width: 100%; } 
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="center">
                <h4 style="margin: 0 0 2px 0; font-size: 18px;">${sanitizeText(storeName)}</h4>
                <div class="header-info">
                  ${address ? `<div>${sanitizeText(address)}</div>` : ''}
                  ${phone ? `<div>TEL: ${sanitizeText(phone)}</div>` : ''}
                  ${email ? `<div>${sanitizeText(email)}</div>` : ''}
                  ${website ? `<div>${sanitizeText(website)}</div>` : ''}
                </div>
                <div class="line"></div>
                <div class="customer-name">${customerName}</div>
                <div style="font-size: 17px; font-weight: 900; margin-bottom: 2px;">#${orderNumber}</div>
              </div>

              <div class="line"></div>
              <div class="timestamp-box">
                ${showOrderDate ? `<div style="display:flex; justify-content:space-between"><span>ORDERED:</span> <span>${orderDateLabel}</span></div>` : ''}
                ${showPrintDate ? `<div style="display:flex; justify-content:space-between"><span>PRINTED:</span> <span>${printDateLabel}</span></div>` : ''}
              </div>

              <div class="line"></div>
              <table>
                <tbody>
                  ${services.map(s => `
                    <tr>
                      <td align="left">${sanitizeText(s.service_name).substring(0, 15)} ${s.quantity || s.weight_kg || 1}X</td>
                      <td align="right">P${formatMoney(s.subtotal)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="line"></div>
              <div class="payment-info">
                ${order.is_paid ? `<div style="display:flex; justify-content:space-between"><span>PAY METHOD:</span><span>${paymentMethod}</span></div>` : ''}
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 2px;">
                  <span>PAY STATUS:</span>
                  ${order.is_paid ? `<span>PAID</span>` : `<span class="unpaid-badge">UNPAID</span>`}
                </div>
                ${deliveryFee > 0 ? `<div style="display:flex; justify-content:space-between; margin-top: 2px;"><span>DELIVERY:</span><span>P${formatMoney(deliveryFee)}</span></div>` : ''}
              </div>

              <div class="total-row">TOTAL: P${formatMoney(totalAmount)}</div>
              
            ${isCash && order.is_paid && amountTendered !== null ? `
                <div class="cash-row">CASH: P${formatMoney(amountTendered)}</div>
                <div class="cash-row">CHANGE: P${formatMoney(changeDue)}</div>
              ` : ''}

             ${enableTracking ? `
                <div class="line"></div>
                <div class="qr-container">
                  <div style="font-size:11px; font-weight:bold; margin-bottom: 2px;">SCAN TO TRACK ORDER</div>
                  <img id="qr-barcode" src="${qrImageUrl}" alt="Tracking QR Code" class="qr-img" />
                  <div class="qr-text">${trackingUrl.replace(/^https?:\/\//, '')}</div>
                </div>
              ` : ''}

              <div class="line"></div>
              <div class="center" style="margin-top: 8px; font-size:12px;">
                <p style="font-weight: 900; font-size: 14px; margin: 4px 0;">${sanitizeText(footerMessage)}</p>
              </div>
            </div>
            
            <script>
              window.onload = function() {
                var qrImg = document.getElementById('qr-barcode');
                
                var executePrint = function() {
                  setTimeout(function() { window.print(); window.close(); }, 200);
                };

                if (!qrImg || qrImg.complete) {
                  executePrint();
                } else {
                  qrImg.onload = executePrint;
                  qrImg.onerror = executePrint; 
                }
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      
      return { success: true };
    } catch (error) {
      console.error("[Browser Print Error]:", error);
      return { success: false, error: error.message || "Failed to execute browser print." };
    }
  }

  return { success: false, error: "Invalid print type specified." };
};