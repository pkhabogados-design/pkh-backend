const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');
const { escanearAlertas }     = require('../services/alertasService');
const { enviarResumenAlertas } = require('../services/emailService');

// GET /api/alertas — obtener alertas no leídas
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM notificaciones
      ORDER BY
        CASE nivel WHEN 'danger' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
        fecha_generacion DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alertas/pendientes — solo no leídas
router.get('/pendientes', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM notificaciones WHERE leida = FALSE
      ORDER BY CASE nivel WHEN 'danger' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
               fecha_generacion DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/alertas/:id/leer
router.patch('/:id/leer', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notificaciones SET leida = TRUE WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alertas/escanear — trigger manual
router.post('/escanear', auth, async (req, res) => {
  try {
    const resultado = await escanearAlertas();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alertas/test-email — envía email de prueba con alertas reales
router.post('/test-email', auth, async (req, res) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({
        error: 'EMAIL_USER y EMAIL_PASS no configurados en las variables de entorno'
      });
    }
    // Escanear alertas reales
    const resultado = await escanearAlertas();

    // Si no hay alertas, crear una de prueba para que el email tenga contenido
    const alertasParaEnviar = resultado.alertas.length > 0
      ? resultado.alertas
      : [{
          tipo: 'test',
          titulo: '✅ Email de prueba — PKH Servicios',
          mensaje: 'El sistema de alertas está funcionando correctamente.',
          nivel: 'info'
        }];

    await enviarResumenAlertas(alertasParaEnviar);

    res.json({
      ok: true,
      emailEnviado: process.env.EMAIL_TO,
      alertasReales: resultado.alertas.length,
      mensaje: `Email enviado a ${process.env.EMAIL_TO} con ${alertasParaEnviar.length} alerta(s)`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
