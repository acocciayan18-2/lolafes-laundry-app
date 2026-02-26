/**
 * Universal Thermal Printing Utility
 * Supports: USB, Bluetooth, Wi-Fi, and Mobile/Desktop Browsers.
 * Best used with a paired printer set as the default destination.
 */

export const printThermalReceipt = (orderData) => {
  // 1. Create a unique title for the print job
  const receiptTitle = `Receipt_${orderData.order_number}`;
  
  // 2. Open a hidden window or iframe
  // Note: On mobile, some browsers block window.open. 
  // We use a small window size that browsers recognize as a "popup"
  const printWindow = window.open('', '_blank', 'width=300,height=600');

  if (!printWindow) {
    alert("Please allow popups to print receipts.");
    return;
  }

  const now = new Date().toLocaleString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const receiptHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${receiptTitle}</title>
        <style>
          /* Thermal printers usually use 58mm or 80mm. 58mm is standard for small wireless. */
          @page { 
            size: 58mm auto; 
            margin: 0; 
          }
          
          * { box-sizing: border-box; }

          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 58mm; 
            padding: 5px 10px; 
            margin: 0; 
            font-size: 12px; 
            line-height: 1.4;
            color: #000;
            background: #fff;
          }

          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .hr { border-bottom: 1px dashed #000; margin: 8px 0; width: 100%; }
          
          .flex { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            gap: 4px;
          }

          .items-container { margin: 10px 0; }
          .service-item { margin-bottom: 4px; }
          
          .total-section { 
            font-size: 14px; 
            margin-top: 8px;
            padding-top: 4px;
          }

          .footer { 
            margin-top: 20px; 
            text-align: center; 
            font-size: 10px; 
            font-style: italic;
          }

          /* Force black text for printing */
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="text-center bold" style="font-size: 18px;">LOLA FE'S LAUNDRY</div>
        <div class="text-center">Quality Laundry Services</div>
        <div class="hr"></div>
        
        <div class="flex"><span>Order:</span> <span class="bold">#${orderData.order_number}</span></div>
        <div class="flex"><span>Date:</span> <span>${now}</span></div>
        <div class="flex"><span>Cust:</span> <span class="bold">${orderData.customer_name}</span></div>
        <div class="hr"></div>

        <div class="bold items-container">SERVICES:</div>
        <div class="items-list">
          ${orderData.services.map(s => `
            <div class="service-item">
              <div class="flex">
                <span style="flex: 1;">${s.service_name}</span>
                <span class="bold">₱${Number(s.subtotal).toFixed(2)}</span>
              </div>
              <div style="font-size: 10px; color: #444;">Qty: ${s.quantity}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="hr"></div>
        
        <div class="flex bold total-section">
          <span>TOTAL AMOUNT:</span>
          <span>₱${Number(orderData.total_amount).toFixed(2)}</span>
        </div>

        <div class="flex" style="margin-top: 8px;">
          <span>Payment:</span>
          <span class="bold">${orderData.is_paid ? 'PAID' : 'UNPAID'}</span>
        </div>
        <div class="flex">
          <span>Method:</span>
          <span style="text-transform: uppercase;">${orderData.payment_method || 'Cash'}</span>
        </div>

        <div class="footer">
          <div class="hr"></div>
          <p>Please present this for claim.</p>
          <p>Thank you for trusting Lola Fe's!</p>
          <p style="font-size: 8px; margin-top: 10px;">${orderData.order_number}</p>
        </div>
        
        <script>
          // Handle automatic printing across different browsers
          window.onload = function() {
            setTimeout(() => {
              window.print();
              // Small delay before closing to ensure the spooler captures the job
              setTimeout(() => {
                window.close();
              }, 500);
            }, 250);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(receiptHTML);
  printWindow.document.close();
};