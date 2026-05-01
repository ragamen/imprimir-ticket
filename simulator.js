function leerNumeroFiscal(texto) {
  const limpio = (texto || '').trim();
  const digitos = limpio.replace(/[^0-9]/g, '');
  if (!digitos) return 0;

  if (digitos.length <= 4) {
    return Number(`0.${digitos.padStart(4, '0')}`);
  }

  const enteros = digitos.slice(0, -4);
  const decimales = digitos.slice(-4);
  return Number(`${Number(enteros)}.${decimales}`);
}

function simularImpresoraFiscal(trama) {
  const lineas = String(trama || '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  const cliente = { rif: '', nombre: '', direccion: '' };
  const productos = [];
  let subtotal = 0;

  lineas.forEach((linea) => {
    if (linea.startsWith('iR*')) {
      cliente.rif = linea.slice(3).trim();
      return;
    }

    if (linea.startsWith('iS*')) {
      cliente.nombre = linea.slice(3).trim();
      return;
    }

    if (linea.startsWith('i01')) {
      cliente.direccion = linea.slice(3).trim();
      return;
    }

    if (linea === '---' || linea.startsWith('3 ') || linea.startsWith('101 ') || linea.startsWith('202 ')) {
      return;
    }

    const prefijo = ['!', String.fromCharCode(34), '#'].includes(linea[0]) ? linea[0] : '';
    const base = prefijo ? linea.slice(1) : linea;

    if (base.length < 24) {
      return;
    }

    const cantidadTxt = base.slice(0, 12);
    const precioTxt = base.slice(12, 24);
    const nombre = base.slice(24).trim() || 'PRODUCTO';

    const cantidad = leerNumeroFiscal(cantidadTxt);
    const precio = leerNumeroFiscal(precioTxt);
    const totalLinea = cantidad * precio;

    subtotal += totalLinea;

    let tipo = 'exento';
    if (prefijo === '!') tipo = 'general';
    if (prefijo === String.fromCharCode(34)) tipo = 'reducida';
    if (prefijo === '#') tipo = 'adicional';

    productos.push({ nombre, tipo, cantidad, precio, totalLinea });
  });

  const respuesta = {
    ok: true,
    metodo: 'simulador',
    cliente,
    productos,
    resumen: {
      subtotal: Number(subtotal.toFixed(2)),
      totalProductos: productos.length
    }
  };

  return respuesta;
}

module.exports = {
  simularImpresoraFiscal
};
