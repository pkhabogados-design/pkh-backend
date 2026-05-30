const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');
const auth    = require('../middleware/auth');

// POST /api/migracion/full
// Recibe el JSON exportado del frontend y popula toda la DB
router.post('/full', auth, async (req, res) => {
  const data = req.body;
  const resultado = { tablas: {}, errores: [] };

  // Helper: extraer array de la key pkhv2_* o key directa
  function get(key, altKey) {
    const v = data[key] || data[altKey];
    if (!v) return [];
    if (Array.isArray(v)) return v;
    try { return JSON.parse(v); } catch { return []; }
  }

  // ── FLOTA ──────────────────────────────────────────────────
  try {
    const items = get('pkhv2_flota', 'flota');
    let ok = 0;
    for (const u of items) {
      await pool.query(`
        INSERT INTO flota (id,pat,tipo,cliente,fecha_entrega,km_entrega,modelo,anio,valor,notas)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO UPDATE SET
          cliente=$4, fecha_entrega=$5, km_entrega=$6, modelo=$7, anio=$8, valor=$9, notas=$10
      `, [u.id||u.pat, u.pat, u.tipo||'propia', u.cli||u.cliente,
          u.fecha||u.fecha_entrega||null, u.kmEnt||u.km_entrega||0,
          u.modelo, u.anio, u.valor||0, u.notas||'']);
      ok++;
    }
    resultado.tablas.flota = ok;
  } catch (e) { resultado.errores.push('flota: '+e.message); }

  // ── CONTRATOS ──────────────────────────────────────────────
  try {
    const items = get('pkhv2_contratos', 'contratos');
    let ok = 0;
    for (const c of items) {
      await pool.query(`
        INSERT INTO contratos
          (empresa,patente,precio_neto,iva,fecha_inicio,fecha_fin,dia_facturacion,estado,observaciones)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT DO NOTHING
      `, [c.emp||c.empresa, c.pat||c.patente, c.precio||c.precio_neto||0,
          c.iva||0.21, c.inicio||c.fecha_inicio||null, c.fin||c.fecha_fin||null,
          c.dia||c.dia_facturacion||1, c.est||c.estado||'activo', c.obs||c.observaciones||'']);
      ok++;
    }
    resultado.tablas.contratos = ok;
  } catch (e) { resultado.errores.push('contratos: '+e.message); }

  // ── FACTURAS ───────────────────────────────────────────────
  try {
    const items = get('pkhv2_fac', 'facturas');
    let ok = 0;
    for (const f of items) {
      const est = f.est==='PAGO'?'pagado' : f.est==='NOTA'?'nota_credito' : f.est==='ANULADA'?'anulada':'pendiente';
      await pool.query(`
        INSERT INTO facturas
          (numero,fecha_emision,empresa,cuit,monto_neto,iva,total,
           fecha_vencimiento,estado,fecha_pago,forma_pago,observaciones)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT DO NOTHING
      `, [String(f.num||f.numero), f.fecha||f.fecha_emision,
          f.emp||f.empresa, f.cuit||'',
          f.monto||f.monto_neto||0, f.iva||0, f.total||0,
          f.venc||f.fecha_vencimiento||null, est,
          f.fpago||f.fecha_pago||null, f.forma||f.forma_pago||'', f.obs||f.observaciones||'']);
      ok++;
    }
    resultado.tablas.facturas = ok;
  } catch (e) { resultado.errores.push('facturas: '+e.message); }

  // ── KM ─────────────────────────────────────────────────────
  try {
    const items = get('pkhv2_km', 'km');
    let ok = 0;
    for (const k of items) {
      await pool.query(`
        INSERT INTO km_registros (patente,mes,anio,km)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (patente,mes,anio) DO UPDATE SET km=$4
      `, [k.pat||k.patente, k.mes, String(k.anio), k.km||0]);
      ok++;
    }
    resultado.tablas.km = ok;
  } catch (e) { resultado.errores.push('km: '+e.message); }

  // ── GASTOS ─────────────────────────────────────────────────
  try {
    const items = get('pkhv2_gas', 'gastos');
    let ok = 0;
    for (const g of items) {
      if (!g.fecha || !g.concepto) continue;
      await pool.query(`
        INSERT INTO gastos (concepto,fecha,monto,origen,categoria)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING
      `, [g.con||g.concepto, g.fecha, g.monto||0, g.orig||g.origen||'', g.cat||g.categoria||'Otro']);
      ok++;
    }
    resultado.tablas.gastos = ok;
  } catch (e) { resultado.errores.push('gastos: '+e.message); }

  // ── DOCUMENTOS ─────────────────────────────────────────────
  try {
    const items = get('pkhv2_docs', 'documentos');
    let ok = 0;
    for (const d of items) {
      await pool.query(`
        INSERT INTO documentos (patente,tipo,fecha_vencimiento,proveedor,costo_anual,notas)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING
      `, [d.pat||d.patente||'SOCIEDAD', d.tipo, d.venc||d.fecha_vencimiento||null,
          d.prov||d.proveedor||'', d.costo||d.costo_anual||0, d.notas||'']);
      ok++;
    }
    resultado.tablas.documentos = ok;
  } catch (e) { resultado.errores.push('documentos: '+e.message); }

  // ── CHEQUES ────────────────────────────────────────────────
  try {
    const items = get('pkhv2_cheq', 'cheques');
    let ok = 0;
    for (const c of items) {
      await pool.query(`
        INSERT INTO cheques (numero,banco,empresa,monto,fecha_cobro,factura_num,estado,observaciones)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING
      `, [c.num||c.numero, c.banco, c.emp||c.empresa, c.monto||0,
          c.fecha||c.fecha_cobro||null, c.factura||c.factura_num||'',
          c.est||c.estado||'pendiente', c.obs||c.observaciones||'']);
      ok++;
    }
    resultado.tablas.cheques = ok;
  } catch (e) { resultado.errores.push('cheques: '+e.message); }

  // ── MANTENIMIENTO ──────────────────────────────────────────
  try {
    const items = get('pkhv2_mant', 'mantenimiento');
    let ok = 0;
    for (const m of items) {
      await pool.query(`
        INSERT INTO mantenimiento (patente,tipo,fecha,km,prox_km,costo,taller,obs)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING
      `, [m.pat||m.patente, m.tipo, m.fecha, m.km||0,
          m.proxkm||m.prox_km||0, m.costo||0, m.taller||'', m.obs||'']);
      ok++;
    }
    resultado.tablas.mantenimiento = ok;
  } catch (e) { resultado.errores.push('mantenimiento: '+e.message); }

  // ── COSTOS MENSUALES ───────────────────────────────────────
  try {
    const costos = get('pkhv2_costos', 'costosMes');
    const obj = Array.isArray(costos) ? {} : costos;
    let ok = 0;
    for (const [periodo, val] of Object.entries(obj)) {
      await pool.query(`
        INSERT INTO costos_mensuales (periodo,vars,fijos,imp,ing)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (periodo) DO UPDATE SET vars=$2,fijos=$3,imp=$4,ing=$5,updated_at=NOW()
      `, [periodo, JSON.stringify(val.vars||[]), JSON.stringify(val.fijos||[]),
          JSON.stringify(val.imp||[]), JSON.stringify(val.ing||[])]);
      ok++;
    }
    resultado.tablas.costos_mensuales = ok;
  } catch (e) { resultado.errores.push('costos: '+e.message); }

  // ── HOMEBANKING ────────────────────────────────────────────
  try {
    const items = get('pkhv2_hb', 'homebanking');
    let ok = 0;
    for (const h of items) {
      await pool.query(`
        INSERT INTO homebanking_movimientos
          (fecha,descripcion,debito,credito,grupo_concepto,concepto,
           numero_comprobante,tipo_movimiento,saldo,categoria,estado_clasificacion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (numero_comprobante) DO NOTHING
      `, [h.fecha, h.desc||h.descripcion, h.deb||h.debito||0, h.cred||h.credito||0,
          h.grupo, h.concepto, h.comp||h.numero_comprobante||null,
          h.tipo, h.saldo, h.categoria, h.categoria?'clasificado':'sin_clasificar']);
      ok++;
    }
    resultado.tablas.homebanking = ok;
  } catch (e) { resultado.errores.push('homebanking: '+e.message); }

  res.json({
    ok: resultado.errores.length === 0,
    resultado,
    mensaje: `Migración ${resultado.errores.length === 0 ? 'completada' : 'con errores'}: ${Object.entries(resultado.tablas).map(([k,v])=>`${k}:${v}`).join(', ')}`
  });
});

module.exports = router;
