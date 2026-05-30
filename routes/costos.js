const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const pool     = require('../db/connection');
const auth     = require('../middleware/auth');
const { procesarExtractoBanco } = require('../services/bancoService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/costos
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM costos_mensuales ORDER BY periodo DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/costos/:periodo
router.put('/:periodo', auth, async (req, res) => {
  const { vars, fijos, imp, ing } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO costos_mensuales (periodo, vars, fijos, imp, ing)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (periodo) DO UPDATE
        SET vars=$2, fijos=$3, imp=$4, ing=$5, updated_at=NOW()
      RETURNING *
    `, [req.params.periodo, JSON.stringify(vars||[]), JSON.stringify(fijos||[]),
        JSON.stringify(imp||[]), JSON.stringify(ing||[])]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/costos/importar-banco  ← FASE 3
router.post('/importar-banco', auth, upload.single('archivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
  try {
    const resultado = await procesarExtractoBanco(req.file.buffer, req.file.mimetype);
    res.json(resultado);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/costos/banco/pendientes — movimientos sin clasificar
router.get('/banco/pendientes', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM homebanking_movimientos
      WHERE estado_clasificacion = 'pendiente'
      ORDER BY fecha DESC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/costos/banco/:id/clasificar — clasificar manualmente
router.patch('/banco/:id/clasificar', auth, async (req, res) => {
  const { categoria, concepto } = req.body;
  try {
    await pool.query(`
      UPDATE homebanking_movimientos
      SET categoria=$1, estado_clasificacion='clasificado' WHERE id=$2
    `, [categoria, req.params.id]);

    // Si tiene débito, crear gasto
    const { rows: [mov] } = await pool.query(
      'SELECT * FROM homebanking_movimientos WHERE id=$1', [req.params.id]
    );
    if (mov && mov.debito > 0 && !mov.gasto_id) {
      const { rows: [g] } = await pool.query(`
        INSERT INTO gastos (concepto,fecha,monto,origen,categoria,movimiento_banco_id)
        VALUES ($1,$2,$3,'HB GALICIA SOCIEDAD',$4,$5) RETURNING id
      `, [concepto||categoria, mov.fecha, mov.debito, categoria, mov.id]);
      await pool.query('UPDATE homebanking_movimientos SET gasto_id=$1 WHERE id=$2', [g.id, mov.id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
