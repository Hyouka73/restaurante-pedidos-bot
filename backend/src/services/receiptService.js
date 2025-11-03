/**
 * Genera un recibo en formato HTML estilo ticket, con CSS mejorado y botón de descarga PDF.
 */
function generateHtmlReceipt(order, restaurantData) {
  const info = restaurantData.info || {};
  const orderId = order.orderNumber || order.id.substring(0, 6).toUpperCase();

  // --- CORRECCIÓN DE FECHA ---
  let date;
  if (order.createdAt && typeof order.createdAt.toDate === 'function') {
    date = order.createdAt.toDate().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' });
  } else if (order.createdAt) {
    date = new Date(order.createdAt).toLocaleString('es-ES', { timeZone: 'America/Mexico_City' });
  } else {
    date = 'Fecha no disponible';
  }

  // --- ITEMS ---
  let itemsHtml = '';
  order.items.forEach(item => {
    const itemTotal = (item.price * item.quantity).toFixed(2);
    itemsHtml += `
      <div class="item-line">
        <span class="qty">${item.quantity}x</span>
        <span class="item">${item.name}</span>
        <span class="price">$${itemTotal}</span>
      </div>
    `;
  });

  let deliveryHtml = '';
  if (order.deliveryFee > 0) {
    deliveryHtml = `<div class="total-line"><span>Envío:</span><span>$${order.deliveryFee.toFixed(2)}</span></div>`;
  }
  
  let discountHtml = '';
  if (order.discount > 0) {
    discountHtml = `<div class="total-line"><span>Descuento:</span><span>-$${order.discount.toFixed(2)}</span></div>`;
  }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Recibo #${orderId}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.2/html2pdf.bundle.min.js"></script>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        font-family: 'Courier New', Courier, monospace;
        margin: 0;
        padding: 20px;
        background-color: #525659;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        min-height: 100vh;
      }
      .receipt {
        width: 80mm;
        max-width: 80mm;
        background-color: #ffffff;
        padding: 10mm;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
        margin: 0 auto;
      }
      .header { 
        font-weight: bold; 
        font-size: 1.2em; 
        margin-bottom: 5px; 
        text-align: center;
        word-wrap: break-word;
      }
      .address { 
        font-size: 0.85em; 
        margin-bottom: 8px; 
        text-align: center;
        word-wrap: break-word;
      }
      hr { 
        border: 0; 
        border-top: 1px dashed #000; 
        margin: 8px 0;
      }
      
      .info-line {
        font-size: 0.9em;
        margin: 3px 0;
        word-wrap: break-word;
      }
      
      .item-line { 
        display: flex;
        gap: 4px;
        font-size: 0.85em; 
        padding: 3px 0;
        line-height: 1.3;
      }
      .item-line .qty { 
        width: 15%; 
        flex-shrink: 0;
      }
      .item-line .item { 
        width: 55%; 
        flex-grow: 1;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      .item-line .price { 
        width: 30%; 
        text-align: right; 
        flex-shrink: 0;
      }

      .totals { 
        margin-top: 8px; 
        font-weight: bold; 
      }
      
      .total-line { 
        display: flex;
        justify-content: space-between;
        padding: 3px 0;
        font-size: 0.9em;
        gap: 8px;
      }
      .total-line span:first-child { 
        text-align: left;
        word-wrap: break-word;
      }
      .total-line span:last-child { 
        text-align: right;
        white-space: nowrap;
      }

      .footer { 
        margin-top: 12px; 
        font-size: 0.9em; 
        text-align: center;
        word-wrap: break-word;
      }
      
      #download-btn {
        width: 100%;
        background-color: #6c757d;
        color: white;
        padding: 12px;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        margin-top: 20px;
        cursor: pointer;
        font-weight: bold;
      }
      #download-btn:hover {
        background-color: #5a6268;
      }
      
      @media print {
        body { 
          background-color: #ffffff; 
          padding: 0; 
          justify-content: flex-start; 
        }
        #download-btn { 
          display: none !important; 
        }
        .receipt { 
          box-shadow: none; 
          width: 80mm; 
          max-width: 80mm; 
          margin: 0;
          padding: 5mm;
        }
      }
    </style>
  </head>
  <body>
    <div class="receipt" id="receipt-content">
      <div class="header">${info.name || 'EL RESTAURANTE'}</div>
      ${info.address ? `<div class="address">${info.address}</div>` : ''}
      <hr>
      <div class="info-line">Pedido: #${orderId}</div>
      <div class="info-line">Cliente: ${order.customer.name}</div>
      <div class="info-line">Fecha: ${date}</div>
      <hr>
      
      ${itemsHtml}
      
      <hr>
      <div class="totals">
        <div class="total-line">
          <span>Subtotal:</span>
          <span>$${order.subtotal.toFixed(2)}</span>
        </div>
        ${deliveryHtml}
        ${discountHtml}
        <hr style="margin: 5px 0;">
        <div class="total-line" style="font-size: 1.05em;">
          <span>TOTAL:</span>
          <span>$${order.total.toFixed(2)}</span>
        </div>
      </div>
      <div class="footer">¡Gracias por tu compra!</div>
      
      <button id="download-btn">Descargar como PDF</button>
    </div>

    <script>
      document.getElementById('download-btn').addEventListener('click', function () {
        const element = document.getElementById('receipt-content');
        const button = document.getElementById('download-btn');
        
        // Ocultar botón antes de generar PDF
        button.style.display = 'none';
        
        // Esperar un momento para que el DOM se actualice
        setTimeout(function() {
          // Calcular altura dinámica del contenido
          const contentHeight = element.offsetHeight;
          // Convertir px a mm (aproximadamente 1mm = 3.78px)
          const heightMm = Math.ceil((contentHeight / 3.78) + 20); // +20mm de margen extra
          
          const opt = {
            margin:       [5, 5, 5, 5], // top, right, bottom, left en mm
            filename:     'recibo-${orderId}.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
              scale: 3,
              useCORS: true,
              logging: false,
              windowWidth: 302 // 80mm = 302px aproximadamente
            },
            jsPDF:        { 
              unit: 'mm', 
              format: [80, heightMm], // Altura dinámica
              orientation: 'portrait',
              compress: true
            }
          };
          
          html2pdf().from(element).set(opt).save().then(function() {
            button.style.display = 'block';
          }).catch(function(error) {
            console.error('Error generando PDF:', error);
            button.style.display = 'block';
            alert('Error al generar el PDF. Por favor intenta de nuevo.');
          });
        }, 100);
      });
    </script>
  </body>
  </html>
  `;
  
  return html;
}

module.exports = {
  generateHtmlReceipt
};