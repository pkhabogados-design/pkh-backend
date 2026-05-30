const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { desde, hasta, tipo } = req.query;
    let q = 'SELECT * FROM homebanking_movimientos WHERE 1=1';
    const params = [];
    if (desde) { params.push(desde); q += ` AND fecha >= $${params.length}`; }
    if (hasta) { params.push(hasta); q += ` AND fecha <= $${params.length}`; }
    if (tipo === 'debito')  q += ' AND debito > 0';
    if (tipo === 'credito') q += ' AND credito > 0';
    q += ' ORDER BY fecha DESC LIMIT 1000';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/bulk', auth, async (req, res) => {
  const { movimientos } = req.body;
  if (!Array.isArray(movimientos)) return res.status(400).json({ error: 'Array requerido' });
  let insertados = 0, duplicados = 0;
  for (const m of movimientos) {
    try {
      await pool.query(`
        INSERT INTO homebanking_movimientos
          (fecha,descripcion,origen,debito,credito,grupo_concepto,concepto,
           numero_comprobante,tipo_movimiento,saldo,categoria,estado_clasificacion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (numero_comprobante) DO NOTHING
      `, [m.fecha,m.desc||m.descripcion,m.origen,m.deb||m.debito||0,
          m.cred||m.credito||0,m.grupo,m.concepto,m.comp||m.numero_comprobante||null,
          m.tipo,m.saldo,m.categoria,m.categoria?'clasificado':'sin_clasificar']);
      insertados++;
    } catch { duplicados++; }
  }
  res.json({ insertados, duplicados });
});

router.delete('/limpiar', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM homebanking_movimientos');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
