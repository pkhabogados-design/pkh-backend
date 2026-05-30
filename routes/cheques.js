const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cheques ORDER BY fecha_cobro ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  const { numero, banco, empresa, monto, fecha_cobro, factura_num, estado, observaciones } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO cheques (numero,banco,empresa,monto,fecha_cobro,factura_num,estado,observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [numero, banco, empresa, monto||0, fecha_cobro, factura_num, estado||'pendiente', observaciones]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id', auth, async (req, res) => {
  const fields = req.body; const keys = Object.keys(fields);
  if (!keys.length) return res.status(400).json({ error: 'Sin campos' });
  const sets = keys.map((k,i) => `${k}=$${i+1}`).join(',');
  try {
    const { rows } = await pool.query(
      `UPDATE cheques SET ${sets} WHERE id=$${keys.length+1} RETURNING *`,
      [...Object.values(fields), req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cheques WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
