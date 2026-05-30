const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM gastos ORDER BY fecha DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  const { concepto, fecha, monto, origen, categoria } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO gastos (concepto,fecha,monto,origen,categoria)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [concepto, fecha, monto, origen, categoria]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/bulk', auth, async (req, res) => {
  const { gastos: items } = req.body;
  if (!Array.isArray(items) || !items.length)
    return res.status(400).json({ error: 'Array requerido' });
  try {
    const inserted = [];
    for (const g of items) {
      const { rows } = await pool.query(`
        INSERT INTO gastos (concepto,fecha,monto,origen,categoria)
        VALUES ($1,$2,$3,$4,$5) RETURNING *
      `, [g.concepto, g.fecha, g.monto, g.origen, g.categoria]);
      inserted.push(rows[0]);
    }
    res.status(201).json({ insertados: inserted.length, items: inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM gastos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
