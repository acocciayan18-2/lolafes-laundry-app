import EscPosEncoder from 'esc-pos-encoder';

const formatSafeDate = (dateSource) => {
  if (!dateSource) return "N/A";
  let date;
  if (dateSource && typeof dateSource === 'object' && 'seconds' in dateSource) {
    date = new Date(dateSource.seconds * 1000);
  } else {
    date = new Date(dateSource);
  }
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const silentPrint = async (order, type, config) => {
  const { 
    storeName, address, phone, email, website, footerMessage,
    showOrderDate, showPrintDate 
  } = config || {};

  const orderDateLabel = formatSafeDate(order.created_at || order.created_date);
  const printDateLabel = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // --- HARDWARE PRINTING (USB / BLUETOOTH) ---
  if (type === 'usb' || type === 'bluetooth') {
    const encoder = new EscPosEncoder();
    let result = encoder
      .initialize()
      .align('center')
      .size('large')
      .line(storeName || "LOLA FE'S LAUNDRY")
      .size('normal');

    if (address) result.line(address);
    if (phone) result.line(`Tel: ${phone}`);
    if (email) result.line(email);
    if (website) result.line(website);
    
    result.line("--------------------------------")
      .size('large').bold(true).line(order.customer_name.toUpperCase()).bold(false).size('normal')
      .line(`ORDER ID: #${order.order_number}`)
      .line("--------------------------------");

    if (showOrderDate) result.align('left').line(`ORDERED: ${orderDateLabel}`);
    if (showPrintDate) result.align('left').line(`PRINTED: ${printDateLabel}`);
    if (showOrderDate || showPrintDate) result.line("--------------------------------");

    order.services?.forEach(s => {
      result.table(
        [{ width: 20, align: 'left' }, { width: 4, align: 'center' }, { width: 8, align: 'right' }],
        [[s.service_name, (s.quantity || s.weight_kg || 1).toString(), `P${Number(s.subtotal || 0)}`]]
      );
    });

    result.line("--------------------------------");
    result.align('left')
      .line(`PAYMENT METHOD: ${order.payment_method?.toUpperCase() || "CASH"}`)
      // ✅ FIXED: Using is_paid boolean
      .line(`PAYMENT STATUS: ${order.is_paid ? "PAID" : "UNPAID"}`);

    if (order.delivery_fee > 0) result.line(`DELIVERY FEE: P${order.delivery_fee}`);

    result.line("--------------------------------")
      .align('right')
      .size('large')
      .bold(true)
      .line(`TOTAL: P${Number(order.total_amount).toLocaleString()}`)
      .size('normal')
      .bold(false)
      .newline()
      .align('center')
      .line(footerMessage || "THANK YOU!")
      .newline()
      .cut();

    const receiptData = result.encode();

    try {
      if (type === 'usb') {
        const device = await navigator.usb.requestDevice({ filters: [] });
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        await device.transferOut(1, receiptData);
        await device.close();
      } else {
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
        await characteristic.writeValue(receiptData);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // --- BROWSER / PDF FALLBACK ---
  if (type === 'browser') {
    try {
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      
      const receiptHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${order.customer_name}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; width: 72mm; margin: 0 auto; padding: 10px; color: #000; }
              .center { text-align: center; }
              .line { border-top: 1px dashed black; margin: 10px 0; }
              .customer-name { font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 5px 0 3px 0; }
              .timestamp-box { font-size: 11px; margin: 5px 0; line-height: 1.4; }
              table { width: 100%; border-collapse: collapse; }
              td { padding: 2px 0; font-size: 13px; }
              .total-row { font-size: 19px; font-weight: bold; margin-top: 10px; text-align: right; }
              .payment-info { font-size: 11px; text-transform: uppercase; }
              .btn-print { display: block; width: 100%; padding: 12px; background: #000; color: #fff; border: none; margin-bottom: 20px; cursor: pointer; border-radius: 4px; font-weight: bold; }
              @media print { .btn-print { display: none; } body { padding: 0; width: 100%; } }
            </style>
          </head>
          <body>
            <button class="btn-print" onclick="window.print()">PRINT RECEIPT</button>
            <div class="receipt">
              <div class="center">
                <h3 style="margin:0">${storeName || "LOLA FE'S LAUNDRY"}</h3>
                <div style="font-size:11px">
                  ${address ? `<div>${address}</div>` : ''}
                  ${phone ? `<div>Tel: ${phone}</div>` : ''}
                  ${email ? `<div>Email: ${email}</div>` : ''}
                  ${website ? `<div>Web: ${website}</div>` : ''}
                </div>
                <div class="line"></div>
                <div class="customer-name">${order.customer_name}</div>
                <div style="font-size: 15px; font-weight: bold;">#${order.order_number}</div>
              </div>

              <div class="timestamp-box">
                ${showOrderDate ? `<div style="display:flex; justify-content:space-between"><span>ORDERED:</span> <span>${orderDateLabel}</span></div>` : ''}
                ${showPrintDate ? `<div style="display:flex; justify-content:space-between"><span>PRINTED:</span> <span>${printDateLabel}</span></div>` : ''}
              </div>

              <div class="payment-info">
                <div style="display:flex; justify-content:space-between">
                  <span>Payment Method:</span>
                  <span style="font-weight:bold">${order.payment_method || "CASH"}</span>
                </div>
                <div style="display:flex; justify-content:space-between">
                  <span>Payment Status:</span>
                  <span style="font-weight:bold">${order.is_paid ? "PAID" : "UNPAID"}</span>
                </div>
                ${order.delivery_fee > 0 ? `
                  <div style="display:flex; justify-content:space-between; margin-top:2px;">
                    <span>Delivery Fee:</span>
                    <span>₱${Number(order.delivery_fee).toLocaleString()}</span>
                  </div>
                ` : ''}
              </div>

              <div class="line"></div>
              <table>
                <tbody>
                  ${order.services.map(s => `
                    <tr>
                      <td align="left">${s.service_name} x${s.quantity || s.weight_kg}</td>
                      <td align="right">₱${Number(s.subtotal || 0).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="line"></div>
              <div class="total-row">TOTAL: ₱${Number(order.total_amount).toLocaleString()}</div>

              <div class="center" style="margin-top:15px; font-size:11px;">
                <p style="text-transform: uppercase; font-weight: bold;">${footerMessage || "THANK YOU FOR YOUR COMING!"}</p>
                <p style="opacity: 0.5">--- End of Receipt ---</p>
              </div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.body.parentElement.innerHTML = receiptHtml;
      printWindow.document.close();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: "Popup blocked! Please enable popups." };
    }
  }
};