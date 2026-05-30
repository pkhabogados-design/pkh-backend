require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app     = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rutas ───────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/alertas', require('./routes/alertas'));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Cron Jobs ───────────────────────────────────────────────
const { iniciarCron } = require('./cron/alertasDiarias');
iniciarCron();

// ── Arranque ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[PKH Backend] Corriendo en puerto ${PORT}`);
});
