const express = require('express');
const fs = require('fs');
const path = require('path');
const { buildFiscalTrama, validarPayloadFiscal } = require('./fiscalBuilder');
const { enviarATerminalSerie } = require('./print');
const { simularImpresoraFiscal } = require('./simulator');

const app = express();
const PORT = process.env.PORT || 3000;
const TICKETS_DIR = path.join(__dirname, 'tickets');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

if (!fs.existsSync(TICKETS_DIR)) {
  fs.mkdirSync(TICKETS_DIR, { recursive: true });
}

function guardarTramaEnTxt(trama) {
  const fileName = `ticket_${Date.now()}.txt`;
  const filePath = path.join(TICKETS_DIR, fileName);
  fs.writeFileSync(filePath, trama, 'utf8');
  return { fileName, filePath };
}

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/api', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Servicio fiscal operativo',
    endpoints: {
      imprimir: 'POST /api/imprimir'
    }
  });
});

app.post('/api/imprimir', async (req, res) => {
  try {
    const payloadEntrada = req.body || {};
    const payload = {
      cliente: payloadEntrada.cliente,
      productos: payloadEntrada.productos,
      pagos: payloadEntrada.pagos
    };
    const errorValidacion = validarPayloadFiscal(payload);
    if (errorValidacion) {
      return res.status(400).json({
        ok: false,
        error: errorValidacion
      });
    }

    const tramaFiscal = buildFiscalTrama(payload);
    const { fileName, filePath } = guardarTramaEnTxt(tramaFiscal);

    let resultadoImpresion;
    try {
      resultadoImpresion = await enviarATerminalSerie(tramaFiscal, {
        portPath: process.env.FISCAL_PORT || 'COM1',
        baudRate: process.env.FISCAL_BAUDRATE || 9600
      });
    } catch (printError) {
      resultadoImpresion = {
        ...simularImpresoraFiscal(tramaFiscal),
        fallback: true,
        motivoFallback: printError.message
      };
    }

    return res.status(200).json({
      ok: true,
      mensaje: 'Ticket procesado',
      archivo: fileName,
      ruta: filePath,
      contenido: tramaFiscal,
      impresion: resultadoImpresion
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al procesar ticket fiscal',
      detalle: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor fiscal escuchando en http://localhost:${PORT}`);
});
