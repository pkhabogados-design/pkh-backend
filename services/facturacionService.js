const pool = require('../db/connection');

// ============================================================
// FASE 2 — Facturación masiva desde contratos activos
// ============================================================
async function generarFacturasMensual() {
  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();

  // Contratos activos
  const { rows: contratos } = await pool.query(`
    SELECT c.*, f.pat, f.modelo
    FROM contratos c
    LEFT JOIN flota f ON f.id = c.patente
    WHERE c.estado = 'activo'
  `);

  if (!contratos.length) {
    return { generadas: 0, total: 0, detalle: [], mensaje: 'No hay contratos activos' };
  }

  // Número de factura siguiente
  const { rows: [{ maxnum }] } = await pool.query(`
    SELECT COALESCE(MAX(CAST(numero AS INTEGER)), 0) AS maxnum
    FROM facturas WHERE numero ~ '^[0-9]+$'
  `);
  let nextNum = (maxnum || 0) + 1;

  const detalle = [];
  let totalFacturado = 0;

  for (const c of contratos) {
    // Verificar si ya fue facturado este mes
    const { rows: existe } = await pool.query(`
      SELECT id FROM facturas
      WHERE contrato_id = $1 AND periodo_mes = $2 AND periodo_anio = $3
    `, [c.id, mes, anio]);

    if (existe.length > 0) {
      detalle.push({ empresa: c.empresa, estado: 'ya_facturado', numero: null });
      continue;
    }

    // Calcular km excedentes
    let montoBase = parseFloat(c.precio_neto) || 0;
    let obsExtra = '';

    if (c.km_tope_mensual) {
      const { rows: [kmRow] } = await pool.query(`
        SELECT COALESCE(SUM(km), 0) AS km_total
        FROM km_registros
        WHERE patente = $1
          AND mes = $2
          AND anio = $3
      `, [c.patente, _mesNombre(mes), String(anio)]);

      const kmReal = parseInt(kmRow.km_total) || 0;
      const excedente = kmReal - c.km_tope_mensual;
      if (excedente > 0) {
        const costoKmExtra = 500; // $/km excedente — configurable
        montoBase += excedente * costoKmExtra;
        obsExtra = ` + ${excedente} km excedentes`;
      }
    }

    const ivaAmt = Math.round(montoBase * (parseFloat(c.iva) || 0.21));
    const total  = montoBase + ivaAmt;

    // Fecha vencimiento = día del contrato del mes siguiente
    const fechaVenc = new Date(anio, mes, c.dia_facturacion || 1);

    await pool.query(`
      INSERT INTO facturas
        (numero, fecha_emision, empresa, cuit, monto_neto, iva, total,
         fecha_vencimiento, estado, contrato_id, periodo_mes, periodo_anio,
         generada_auto, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendiente',$9,$10,$11,TRUE,$12)
    `, [
      String(nextNum),
      hoy.toISOString().split('T')[0],
      c.empresa,
      '',
      montoBase,
      ivaAmt,
      total,
      fechaVenc.toISOString().split('T')[0],
      c.id,
      mes,
      anio,
      `Período ${_mesNombre(mes)} ${anio}${obsExtra}`
    ]);

    detalle.push({ empresa: c.empresa, numero: nextNum, total, estado: 'generada' });
    totalFacturado += total;
    nextNum++;
  }

  const generadas = detalle.filter(d => d.estado === 'generada').length;

  // Log
  await pool.query(`
    INSERT INTO facturacion_masiva_log
      (periodo_mes, periodo_anio, facturas_generadas, total_facturado, detalle)
    VALUES ($1,$2,$3,$4,$5)
  `, [mes, anio, generadas, totalFacturado, JSON.stringify(detalle)]);

  return {
    generadas,
    total: totalFacturado,
    mes: `${_mesNombre(mes)} ${anio}`,
    detalle
  };
}

function _mesNombre(n) {
  return ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
          'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][n - 1];
}

module.exports = { generarFacturasMensual };
