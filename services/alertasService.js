const pool = require('../db/connection');

// ============================================================
// Detecta vencimientos y genera notificaciones
// ============================================================

async function escanearAlertas() {
  const hoy = new Date().toISOString().split('T')[0];
  const alertas = [];

  // --- 1. Facturas vencidas o por vencer en 15 días ---
  const { rows: facturas } = await pool.query(`
    SELECT id, numero, empresa, total, fecha_vencimiento
    FROM facturas
    WHERE estado NOT IN ('pagado','nota_credito','anulada')
      AND fecha_vencimiento IS NOT NULL
      AND fecha_vencimiento <= (CURRENT_DATE + INTERVAL '15 days')
    ORDER BY fecha_vencimiento ASC
  `);

  for (const f of facturas) {
    const diff = Math.round((new Date(f.fecha_vencimiento) - new Date(hoy)) / 86400000);
    const vencida = diff < 0;
    alertas.push({
      tipo: 'factura_vencimiento',
      titulo: vencida
        ? `Factura N°${f.numero} VENCIDA — ${f.empresa}`
        : `Factura N°${f.numero} vence en ${diff} días — ${f.empresa}`,
      mensaje: `Monto: $${Number(f.total).toLocaleString('es-AR')}. Vencimiento: ${f.fecha_vencimiento}`,
      referencia_tipo: 'factura',
      referencia_id: f.id,
      nivel: vencida ? 'danger' : diff <= 5 ? 'danger' : 'warning',
      fecha_ref: f.fecha_vencimiento
    });
  }

  // --- 2. Documentos próximos a vencer (30 días) ---
  const { rows: docs } = await pool.query(`
    SELECT id, patente, tipo, fecha_vencimiento
    FROM documentos
    WHERE fecha_vencimiento IS NOT NULL
      AND fecha_vencimiento <= (CURRENT_DATE + INTERVAL '30 days')
    ORDER BY fecha_vencimiento ASC
  `);

  for (const d of docs) {
    const diff = Math.round((new Date(d.fecha_vencimiento) - new Date(hoy)) / 86400000);
    const vencido = diff < 0;
    alertas.push({
      tipo: 'documento_vencimiento',
      titulo: vencido
        ? `${d.tipo} — ${d.patente} VENCIDO`
        : `${d.tipo} — ${d.patente} vence en ${diff} días`,
      mensaje: `Fecha vencimiento: ${d.fecha_vencimiento}`,
      referencia_tipo: 'documento',
      referencia_id: d.id,
      nivel: vencido ? 'danger' : diff <= 7 ? 'danger' : 'warning',
      fecha_ref: d.fecha_vencimiento
    });
  }

  // --- 3. Contratos con km al 90% del tope ---
  const { rows: contratos } = await pool.query(`
    SELECT c.id, c.empresa, c.patente, c.km_tope_mensual,
           COALESCE(SUM(k.km), 0) AS km_mes
    FROM contratos c
    LEFT JOIN km_registros k
      ON k.patente = c.patente
      AND k.mes = TO_CHAR(CURRENT_DATE, 'MONTH')
      AND k.anio = TO_CHAR(CURRENT_DATE, 'YYYY')
    WHERE c.estado = 'activo'
      AND c.km_tope_mensual IS NOT NULL
      AND c.km_tope_mensual > 0
    GROUP BY c.id, c.empresa, c.patente, c.km_tope_mensual
    HAVING COALESCE(SUM(k.km), 0) >= c.km_tope_mensual * 0.9
  `);

  for (const c of contratos) {
    const pct = Math.round((c.km_mes / c.km_tope_mensual) * 100);
    alertas.push({
      tipo: 'km_limite',
      titulo: `${c.patente} — ${pct}% del tope de km (${c.empresa})`,
      mensaje: `Km recorridos: ${c.km_mes} / ${c.km_tope_mensual} este mes.`,
      referencia_tipo: 'contrato',
      referencia_id: c.id,
      nivel: pct >= 100 ? 'danger' : 'warning',
      fecha_ref: hoy
    });
  }

  // --- Insertar solo alertas nuevas (evitar duplicados del día) ---
  let insertadas = 0;
  for (const a of alertas) {
    const existe = await pool.query(`
      SELECT id FROM notificaciones
      WHERE tipo = $1
        AND referencia_id = $2
        AND DATE(fecha_generacion) = CURRENT_DATE
    `, [a.tipo, a.referencia_id]);

    if (existe.rows.length === 0) {
      await pool.query(`
        INSERT INTO notificaciones
          (tipo, titulo, mensaje, referencia_tipo, referencia_id, nivel, fecha_ref)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [a.tipo, a.titulo, a.mensaje, a.referencia_tipo, a.referencia_id, a.nivel, a.fecha_ref]);
      insertadas++;
    }
  }

  console.log(`[ALERTAS] ${alertas.length} detectadas, ${insertadas} nuevas insertadas.`);
  return { total: alertas.length, nuevas: insertadas, alertas };
}

module.exports = { escanearAlertas };
