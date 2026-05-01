const productosHardcodeados = [
  { tipo: 'exento', cantidad: 2.5, precio: 120.0, nombre: 'ACEITE DE MAIZ 1L' },
  { tipo: 'general', cantidad: 1.0, precio: 350.5, nombre: 'QUESO MOZZARELLA KG' },
  { tipo: 'reducida', cantidad: 3.0, precio: 45.0, nombre: 'HARINA DE TRIGO' },
  { tipo: 'adicional', cantidad: 2.0, precio: 180.0, nombre: 'ATUN EN LATA' },
  { tipo: 'general', cantidad: 1.5, precio: 150.0, nombre: 'JAMON DE PIERNA' }
];

// El pago se toma ahora desde la UI

function padNumeroFiscal(valor) {
  const numero = Number(valor) || 0;
  return (
    Math.floor(numero).toString().padStart(8, '0') +
    (numero % 1).toFixed(4).split('.')[1]
  );
}

function prefijoTipo(tipo) {
  if (tipo === 'general') return '!';
  if (tipo === 'reducida') return String.fromCharCode(34); // Representa "
  if (tipo === 'adicional') return '#';
  return ''; // Exento no lleva prefijo
}

function generarTramaFactura(payload) {
  const { cliente, productos, pagos } = payload;
  const tramaFiscal = [];

  tramaFiscal.push(`iR*${cliente.rif}`);
  tramaFiscal.push(`iS*${cliente.nombre}`);
  tramaFiscal.push(`i01${cliente.direccion}`);
  tramaFiscal.push('---');

  productos.forEach((prod) => {
    const prefijo = prefijoTipo(prod.tipo);
    const cantidadStr = padNumeroFiscal(prod.cantidad);
    const precioStr = padNumeroFiscal(prod.precio);
    tramaFiscal.push(`${prefijo}${cantidadStr}${precioStr}${prod.nombre.padEnd(20, ' ')}`);
  });

  // Solo un pago permitido
  if (pagos && pagos.length > 0) {
    const pago = pagos[0];
    let cod = '';
    if (pago.tipo === 'efectivo') cod = '101 efectivo';
    else if (pago.tipo === 'banco') cod = '202 banco';
    if (cod) tramaFiscal.push(`${cod} ${Number(pago.monto).toFixed(2)}`);
  }

  tramaFiscal.push('3 cierra factura');

  return tramaFiscal.join('\n');
}

function renderProductos() {
  const tbody = document.getElementById('tabla-productos');
  if (tbody) {
    tbody.innerHTML = productosHardcodeados
      .map(
        (p) => `
        <tr>
          <td>${p.tipo}</td>
          <td>${p.nombre}</td>
          <td>${p.cantidad}</td>
          <td>${p.precio.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');
  }
}

function renderTicketLateral(payload) {
  const ticketDiv = document.getElementById('ticket-lateral');
  if (!ticketDiv) return;
  const { cliente, productos, pagos } = payload;
  let html = '';
  html += `<div class="ticket-title">TICKET FISCAL</div>`;
  html += `<div class="ticket-line">RIF: ${cliente.rif}</div>`;
  html += `<div class="ticket-line">${cliente.nombre}</div>`;
  html += `<div class="ticket-line">${cliente.direccion}</div>`;
  html += `<hr class="ticket-hr" />`;
  productos.forEach((prod) => {
    html += `<div class="ticket-line">${prod.nombre.slice(0,18).padEnd(18)} ${prod.cantidad} x ${prod.precio.toFixed(2)}</div>`;
  });
  html += `<hr class="ticket-hr" />`;
  if (pagos && pagos.length > 0) {
    const pago = pagos[0];
    let label = pago.tipo === 'efectivo' ? 'EFECTIVO' : 'BANCO';
    html += `<div class="ticket-line">Pago: ${label}</div>`;
    html += `<div class="ticket-line">Monto: ${Number(pago.monto).toFixed(2)}</div>`;
  }
  html += `<hr class="ticket-hr" />`;
  html += `<div class="ticket-line">${new Date().toLocaleString()}</div>`;
  ticketDiv.innerHTML = html;
}

async function enviarFactura() {
  const boton = document.getElementById('btn-enviar');
  const estado = document.getElementById('estado');
  const salidaTrama = document.getElementById('trama');
  const salidaRespuesta = document.getElementById('respuesta');

  // Tomar tipo y monto de pago desde la UI
  const tipoPago = document.getElementById('tipo-pago')?.value || 'efectivo';
  const montoPago = parseFloat(document.getElementById('monto-pago')?.value) || 0;

  const payload = {
    cliente: {
      rif: document.getElementById('rif')?.value.trim() || 'V263532112',
      nombre: document.getElementById('nombre')?.value.trim() || 'CI OPERATIVA DE ALIM',
      direccion: document.getElementById('direccion')?.value.trim() || 'AV. PRINCIPAL LOCAL 1'
    },
    productos: productosHardcodeados,
    pagos: [
      { tipo: tipoPago, monto: montoPago }
    ]
  };

  const trama = generarTramaFactura(payload);
  if (salidaTrama) salidaTrama.textContent = trama;
  renderTicketLateral(payload);

  if (boton) boton.disabled = true;
  if (estado) {
    estado.textContent = 'Enviando...';
    estado.className = 'badge';
  }

  try {
    const resp = await fetch('/api/imprimir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (salidaRespuesta) salidaRespuesta.textContent = JSON.stringify(data, null, 2);

    if (!resp.ok || !data.ok) {
      throw new Error(data.error || data.mensaje || 'No se pudo procesar la factura');
    }

    if (estado) {
      estado.textContent = data.impresion && data.impresion.fallback
        ? 'Enviado al simulador'
        : 'Enviado a impresora';
      estado.className = 'badge ok';
    }
  } catch (error) {
    if (estado) {
      estado.textContent = `Fallo: ${error.message}`;
      estado.className = 'badge';
    }
  } finally {
    if (boton) boton.disabled = false;
  }
}

// Inicialización de eventos
const btnEnviar = document.getElementById('btn-enviar');
if (btnEnviar) {
  btnEnviar.addEventListener('click', enviarFactura);
}
renderProductos();
// Render inicial vacío
renderTicketLateral({cliente:{rif:'',nombre:'',direccion:''},productos:[],pagos:[]});