const fs   = require('fs');
const path = require('path');
const pool = require('./connection');

async function migrate() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  console.log(`[MIGRATE] Ejecutando ${files.length} migraciones...`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`  → ${file}`);
    await pool.query(sql);
  }

  console.log('[MIGRATE] ✓ Completado');
  process.exit(0);
}

migrate().catch(err => {
  console.error('[MIGRATE] Error:', err.message);
  process.exit(1);
});
