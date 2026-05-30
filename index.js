require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app     = express();

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
app.use('/api/costos',    require('./routes/costos'));
app.use('/api/km',        require('./routes/km'));

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date(), version: '1.3.0' }));

// ── Cron Jobs ───────────────────────────────────────────────
require('./cron/alertasDiarias').iniciarCron();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[PKH Backend] v1.3.0 en puerto ${PORT}`));
