function padNumeroFiscal(valor) {
  const numero = Number(valor) || 0;
  const entero = Math.floor(numero).toString().padStart(8, '0');
  const decimal = (numero % 1).toFixed(4).split('.')[1];
  return `${entero}${decimal}`;
}

function obtenerPrefijoTipo(tipo) {
  if (tipo === 'general') return '!';
  if (tipo === 'reducida') return String.fromCharCode(34);
  if (tipo === 'adicional') return '#';
  return '';
}

function normalizarNombreProducto(nombre) {
  const texto = (nombre || 'PRODUCTO').toString();
  return texto.padEnd(20, ' ').slice(0, 20);
}

function buildFiscalTrama(payload) {
  const cliente = payload.cliente || {};
  const productos = Array.isArray(payload.productos) ? payload.productos : [];
  const pagos = Array.isArray(payload.pagos) ? payload.pagos : [];

  const lineas = [];

  lineas.push(`iR*${cliente.rif || ''}`);
  lineas.push(`iS*${cliente.nombre || ''}`);
  lineas.push(`i01${cliente.direccion || ''}`);
  lineas.push('---');

  productos.forEach((prod) => {
    const prefijo = obtenerPrefijoTipo(prod.tipo);
    const cantidad = padNumeroFiscal(prod.cantidad);
    const precio = padNumeroFiscal(prod.precio);
    const descripcion = normalizarNombreProducto(prod.nombre);
    lineas.push(`${prefijo}${cantidad}${precio}${descripcion}`);
  });

  // Solo se permite un pago, efectivo (101) o banco (202)
  if (pagos.length > 0) {
    const pago = pagos[0];
    const monto = (Number(pago.monto) || 0).toFixed(2);
    if (pago.tipo === 'efectivo') {
      lineas.push(`101 efectivo ${monto}`);
    } else if (pago.tipo === 'banco') {
      lineas.push(`202 banco ${monto}`);
    }
  }

  lineas.push('3 cierra factura');

  return lineas.join('\n');
}

function validarPayloadFiscal(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'El cuerpo debe ser un objeto JSON valido';
  }

  const cliente = payload.cliente;
  const productos = payload.productos;

  if (!cliente || typeof cliente !== 'object') {
    return "Falta el objeto 'cliente'";
  }

  if (!cliente.rif || !cliente.nombre || !cliente.direccion) {
    return "El cliente requiere 'rif', 'nombre' y 'direccion'";
  }

  if (!Array.isArray(productos) || productos.length === 0) {
    return "'productos' debe ser un arreglo con al menos 1 elemento";
  }

  return null;
}

module.exports = {
  buildFiscalTrama,
  validarPayloadFiscal
};
