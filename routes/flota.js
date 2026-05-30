const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM flota ORDER BY pat');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  const { id, pat, tipo, cliente, fecha_entrega, km_entrega, modelo, anio, valor, notas } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO flota (id,pat,tipo,cliente,fecha_entrega,km_entrega,modelo,anio,valor,notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [id||pat, pat, tipo||'propia', cliente, fecha_entrega, km_entrega||0, modelo, anio, valor||0, notas]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', auth, async (req, res) => {
  const fields = req.body;
  const keys   = Object.keys(fields);
  if (!keys.length) return res.status(400).json({ error: 'Sin campos' });
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  try {
    const { rows } = await pool.query(
      `UPDATE flota SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
      [...Object.values(fields), req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM flota WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
