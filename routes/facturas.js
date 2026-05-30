const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');
const { generarFacturasMensual } = require('../services/facturacionService');

// GET /api/facturas
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM facturas ORDER BY fecha_emision DESC'
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/facturas
router.post('/', auth, async (req, res) => {
  const { numero, fecha_emision, empresa, cuit, monto_neto, iva, total,
          fecha_vencimiento, estado, fecha_pago, forma_pago, observaciones,
          contrato_id } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO facturas
        (numero,fecha_emision,empresa,cuit,monto_neto,iva,total,
         fecha_vencimiento,estado,fecha_pago,forma_pago,observaciones,contrato_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
    `, [numero,fecha_emision,empresa,cuit,monto_neto,iva,total,
        fecha_vencimiento,estado||'pendiente',fecha_pago,forma_pago,observaciones,contrato_id]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/facturas/:id
router.patch('/:id', auth, async (req, res) => {
  const fields = req.body;
  const keys   = Object.keys(fields);
  if (!keys.length) return res.status(400).json({ error: 'Sin campos' });
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  try {
    const { rows } = await pool.query(
      `UPDATE facturas SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`,
      [...Object.values(fields), req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/facturas/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM facturas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/facturas/generar-mensual  ← FASE 2
router.post('/generar-mensual', auth, async (req, res) => {
  try {
    const resultado = await generarFacturasMensual();
    res.json(resultado);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
