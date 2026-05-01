const { SerialPort } = require('serialport');

function enviarATerminalSerie(trama, options = {}) {
  const portPath = options.portPath || process.env.FISCAL_PORT || 'COM1';
  const baudRate = Number(options.baudRate || process.env.FISCAL_BAUDRATE || 9600);

  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: portPath,
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false
    });

    let respuesta = '';

    port.open((openError) => {
      if (openError) {
        reject(new Error(`No se pudo abrir ${portPath}: ${openError.message}`));
        return;
      }

      port.write(`${trama}\r`, (writeError) => {
        if (writeError) {
          port.close(() => {
            reject(new Error(`Error al escribir en ${portPath}: ${writeError.message}`));
          });
          return;
        }

        setTimeout(() => {
          port.close((closeError) => {
            if (closeError) {
              reject(new Error(`Error al cerrar ${portPath}: ${closeError.message}`));
              return;
            }

            resolve({
              ok: true,
              metodo: 'serial',
              puerto: portPath,
              respuesta: respuesta.trim() || 'SIN_RESPUESTA'
            });
          });
        }, 300);
      });
    });

    port.on('data', (data) => {
      respuesta += data.toString();
    });

    port.on('error', (error) => {
      reject(new Error(`Falla en puerto serie ${portPath}: ${error.message}`));
    });
  });
}

module.exports = {
  enviarATerminalSerie
};
