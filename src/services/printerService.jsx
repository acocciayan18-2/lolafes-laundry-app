import EscPosEncoder from 'esc-pos-encoder';

export const silentPrint = async (order, type) => {
  // If using Hardware (Wired/BT), use the library
  if (type === 'usb' || type === 'bluetooth') {
    const encoder = new EscPosEncoder();
    const receiptData = encoder
      .initialize()
      .align('center')
      .line("LOLA FE'S LAUNDRY")
      .line(`ORDER: #${order.order_number}`)
      .newline()
      .cut()
      .encode();

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

  // --- FALLBACK FOR TESTING (WPS / PDF / DOCS) ---
  // --- Inside printerService.js ---

if (type === 'browser') {
  try {
    // 1. Create a clean receipt window
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    // 2. Write the receipt content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lola Fe's Receipt Test</title>
          <style>
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; /* Standard thermal width for testing */
              margin: 0 auto; 
              padding: 20px;
              background-color: #f9f9f9;
            }
            .receipt {
              background: white;
              padding: 15px;
              border: 1px dashed #ccc;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .line { border-top: 1px dashed black; margin: 10px 0; }
            table { width: 100%; font-size: 12px; }
            .btn-print { 
              display: block; width: 100%; padding: 10px; 
              background: #000; color: #fff; border: none; 
              margin-bottom: 20px; cursor: pointer; border-radius: 8px;
            }
            @media print {
              .btn-print { display: none; } /* Hide the button when printing starts */
              body { background: white; padding: 0; }
              .receipt { border: none; }
            }
          </style>
        </head>
        <body>
          <button class="btn-print" onclick="window.print()">Send to WPS / Printer</button>
          
          <div class="receipt">
            <div class="center">
              <h2 style="margin:0">LOLA FE'S LAUNDRY</h2>
              <p style="font-size:10px">Thermal Receipt Test</p>
            </div>
            <div class="line"></div>
            <p><strong>ORDER:</strong> #${order.order_number}</p>
            <p><strong>CUSTOMER:</strong> ${order.customer_name}</p>
            <div class="line"></div>
            <table>
              <thead>
                <tr>
                  <th align="left">Service</th>
                  <th align="center">Qty</th>
                  <th align="right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.services.map(s => `
                  <tr>
                    <td>${s.service_name}</td>
                    <td align="center">${s.quantity}</td>
                    <td align="right">P${s.total_amount}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="line"></div>
            <h3 class="right">TOTAL: P${order.total_amount}</h3>
            <div class="center" style="margin-top:20px; font-size:10px;">
              <p>Verify your printer settings</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    return { success: true };
  } catch (error) {
    return { success: false, error: "Popup blocked! Allow popups in Chrome settings." };
  }
}
};