const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM mantenimiento ORDER BY fecha DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  const { patente, tipo, fecha, km, prox_km, costo, taller, obs } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO mantenimiento (patente,tipo,fecha,km,prox_km,costo,taller,obs)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [patente, tipo, fecha, km||0, prox_km||0, costo||0, taller, obs]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM mantenimiento WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
