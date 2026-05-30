const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM km_registros ORDER BY anio DESC, patente');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  const { patente, mes, anio, km } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO km_registros (patente,mes,anio,km)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (patente,mes,anio) DO UPDATE SET km=$4
      RETURNING *
    `, [patente, mes, anio, km]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/bulk', auth, async (req, res) => {
  const { registros } = req.body;
  if (!Array.isArray(registros)) return res.status(400).json({ error: 'Array requerido' });
  try {
    const saved = [];
    for (const r of registros) {
      const { rows } = await pool.query(`
        INSERT INTO km_registros (patente,mes,anio,km)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (patente,mes,anio) DO UPDATE SET km=$4
        RETURNING *
      `, [r.patente, r.mes, r.anio, r.km]);
      saved.push(rows[0]);
    }
    res.status(201).json({ guardados: saved.length, items: saved });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
