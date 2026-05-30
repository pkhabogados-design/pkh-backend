const pool = require('../db/connection');

// ============================================================
// FASE 3 — Motor de clasificación bancaria
// ============================================================

const REGLAS = [
  { palabras: ['MICROTRACK','MICRACEL','MICRA CEL'],  categoria: 'Operativo',      concepto: 'Microtrack' },
  { palabras: ['SEGURO','DEB. AUTOM. DE SERV'],       categoria: 'Seguros',        concepto: 'Seguro camioneta' },
  { palabras: ['VEP','AFIP','AUTONOMO','AUTÓNOMO'],   categoria: 'Impuestos',      concepto: 'VEP Autónomo' },
  { palabras: ['IIBB','INGRESOS BRUTOS','ING.BRUTOS'],categoria: 'Impuestos',      concepto: 'VEP IIBB' },
  { palabras: ['IVA'],                                 categoria: 'Impuestos',      concepto: 'VEP IVA' },
  { palabras: ['AROCENA','HONORARIOS','CONTADOR'],    categoria: 'Contador',       concepto: 'Honorarios contador' },
  { palabras: ['RSV'],                                 categoria: 'Operativo',      concepto: 'RSV' },
  { palabras: ['CONTROL DOCUMENTAL','DOC.CONTROL'],   categoria: 'Administrativo', concepto: 'Control Documental' },
  { palabras: ['VISA','TARJETA','TC '],                categoria: 'Impuestos',      concepto: 'Tarjeta Visa' },
  { palabras: ['YPF','SHELL','AXION','NAFTA','COMBUSTIBLE'], categoria: 'Operativo', concepto: 'Combustible' },
  { palabras: ['PEAJE','TELEPASE','AUPASS'],           categoria: 'Operativo',      concepto: 'Peajes' },
  { palabras: ['GARCIA','DEVOLUCION','DEVOLUCIÓN'],   categoria: 'Administrativo', concepto: 'Devol. Juli García' },
  { palabras: ['PATENTE'],                             categoria: 'Patentes',       concepto: 'Patente' },
  { palabras: ['CUBIERTAS','NEUMATICOS','NEUMÁTICOS'],categoria: 'Mantenimiento',  concepto: 'Cubiertas' },
  { palabras: ['SERVICE','TALLER','REPARACION'],      categoria: 'Mantenimiento',  concepto: 'Service' },
];

function clasificar(descripcion) {
  const desc = (descripcion || '').toUpperCase();
  for (const r of REGLAS) {
    if (r.palabras.some(p => desc.includes(p))) {
      return { categoria: r.categoria, concepto: r.concepto };
    }
  }
  return null;
}

function parsearNumero(s) {
  if (!s) return 0;
  s = String(s).trim().replace(/[$\s]/g, '');
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  return parseFloat(s) || 0;
}

function parsearFecha(s) {
  if (!s) return null;
  s = String(s).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  return null;
}

function parsearCSV(texto, sep = ',') {
  const lineas = texto.replace(/\r/g, '').trim().split('\n');
  const headers = lineas[0].split(sep).map(h => h.trim().replace(/^"|"$/g, '').toUpperCase());
  const rows = [];
  for (let i = 1; i < lineas.length; i++) {
    const vals = lineas[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    if (vals.every(v => !v)) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

async function procesarExtractoBanco(buffer, mimetype) {
  const texto = buffer.toString('utf8');
  const sep = texto.split('\n')[0].split(';').length > texto.split('\n')[0].split(',').length ? ';' : ',';
  const rows = parsearCSV(texto, sep);

  const resultados = { clasificados: 0, pendientes: 0, duplicados: 0, total: rows.length };

  for (const r of rows) {
    const fecha     = parsearFecha(r['FECHA'] || r['FECHA ']);
    const desc      = r['DESCRIPCIÓN'] || r['DESCRIPCION'] || r['DESCRIPTION'] || '';
    const debito    = parsearNumero(r['DÉBITOS'] || r['DEBITOS'] || r['DEBITO'] || r['DÉBITO'] || '');
    const credito   = parsearNumero(r['CRÉDITOS'] || r['CREDITOS'] || r['CREDITO'] || r['CRÉDITO'] || '');
    const concepto  = r['CONCEPTO'] || '';
    const grupo     = r['GRUPO DE CONCEPTOS'] || r['GRUPO'] || '';
    const comprobante = r['NÚMERO DE COMPROBANTE'] || r['NUMERO DE COMPROBANTE'] || r['COMPROBANTE'] || '';
    const tipo      = r['TIPO DE MOVIMIENTO'] || r['TIPO'] || '';
    const saldo     = parsearNumero(r['SALDO'] || '');

    if (!fecha && !desc) continue;

    // Deduplicar por comprobante
    if (comprobante) {
      const { rows: dup } = await pool.query(
        'SELECT id FROM homebanking_movimientos WHERE numero_comprobante = $1', [comprobante]
      );
      if (dup.length > 0) { resultados.duplicados++; continue; }
    }

    // Clasificar
    const clasif = clasificar(desc || concepto);

    // Insertar en homebanking_movimientos
    const { rows: [mov] } = await pool.query(`
      INSERT INTO homebanking_movimientos
        (fecha,descripcion,debito,credito,grupo_concepto,concepto,
         numero_comprobante,tipo_movimiento,saldo,
         categoria,estado_clasificacion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
    `, [
      fecha, desc, debito, credito, grupo, concepto,
      comprobante || null, tipo, saldo,
      clasif ? clasif.categoria : null,
      clasif ? 'clasificado' : 'pendiente'
    ]);

    // Si es débito y fue clasificado → crear gasto automáticamente
    if (clasif && debito > 0) {
      const { rows: [gasto] } = await pool.query(`
        INSERT INTO gastos (concepto, fecha, monto, origen, categoria, movimiento_banco_id)
        VALUES ($1,$2,$3,'HB GALICIA SOCIEDAD',$4,$5) RETURNING id
      `, [clasif.concepto + (desc ? ` — ${desc.slice(0,60)}` : ''), fecha, debito, clasif.categoria, mov.id]);

      await pool.query(
        'UPDATE homebanking_movimientos SET gasto_id = $1 WHERE id = $2',
        [gasto.id, mov.id]
      );
      resultados.clasificados++;
    } else {
      resultados.pendientes++;
    }
  }

  return resultados;
}

module.exports = { procesarExtractoBanco, clasificar };
