const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows: s } = await pool.query('SELECT * FROM socios ORDER BY nombre');
    const { rows: a } = await pool.query('SELECT * FROM aportes ORDER BY fecha DESC');
    res.json({ socios: s, aportes: a });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/aporte', auth, async (req, res) => {
  const { socio, concepto, monto, monto_usd, fecha } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO aportes (socio,concepto,monto,monto_usd,fecha)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [socio, concepto, monto||0, monto_usd||0, fecha]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
