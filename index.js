require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app     = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rutas ───────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/alertas',   require('./routes/alertas'));
app.use('/api/facturas',  require('./routes/facturas'));
app.use('/api/contratos', require('./routes/contratos'));
app.use('/api/flota',     require('./routes/flota'));
app.use('/api/gastos',    require('./routes/gastos'));

// Health check
app.get('/health', (_, res) => res.json({
  status: 'ok',
  ts: new Date(),
  version: '1.2.0'
}));

// ── Cron Jobs ───────────────────────────────────────────────
const { iniciarCron } = require('./cron/alertasDiarias');
iniciarCron();

// ── Arranque ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[PKH Backend] v1.2.0 corriendo en puerto ${PORT}`);
});
