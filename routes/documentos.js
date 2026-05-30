const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM documentos ORDER BY fecha_vencimiento ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  const { patente, tipo, fecha_vencimiento, proveedor, costo_anual, notas } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO documentos (patente,tipo,fecha_vencimiento,proveedor,costo_anual,notas)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [patente||'SOCIEDAD', tipo, fecha_vencimiento, proveedor, costo_anual||0, notas]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', auth, async (req, res) => {
  const fields = req.body; const keys = Object.keys(fields);
  if (!keys.length) return res.status(400).json({ error: 'Sin campos' });
  const sets = keys.map((k,i) => `${k}=$${i+1}`).join(',');
  try {
    const { rows } = await pool.query(
      `UPDATE documentos SET ${sets} WHERE id=$${keys.length+1} RETURNING *`,
      [...Object.values(fields), req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM documentos WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
