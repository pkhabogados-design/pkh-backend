const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  // App Password de Gmail
  }
});

async function enviarResumenAlertas(alertas) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[EMAIL] No configurado — omitiendo envío');
    return;
  }
  if (!alertas || alertas.length === 0) return;

  const dangers = alertas.filter(a => a.nivel === 'danger');
  const warnings = alertas.filter(a => a.nivel === 'warning');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1D3557;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">🔔 PKH Servicios — Alertas del día</h2>
        <p style="margin:4px 0;opacity:.8">${new Date().toLocaleDateString('es-AR')}</p>
      </div>
      ${dangers.length ? `
      <div style="padding:16px;background:#fef2f2;border-left:4px solid #E24B4A">
        <h3 style="color:#E24B4A;margin:0 0 12px">🔴 Críticas (${dangers.length})</h3>
        ${dangers.map(a => `<div style="margin-bottom:8px;padding:8px;background:white;border-radius:4px">
          <b>${a.titulo}</b><br><span style="color:#666;font-size:13px">${a.mensaje}</span>
        </div>`).join('')}
      </div>` : ''}
      ${warnings.length ? `
      <div style="padding:16px;background:#fffbeb;border-left:4px solid #BA7517">
        <h3 style="color:#BA7517;margin:0 0 12px">🟡 Advertencias (${warnings.length})</h3>
        ${warnings.map(a => `<div style="margin-bottom:8px;padding:8px;background:white;border-radius:4px">
          <b>${a.titulo}</b><br><span style="color:#666;font-size:13px">${a.mensaje}</span>
        </div>`).join('')}
      </div>` : ''}
      <div style="padding:12px;background:#f3f4f6;text-align:center;font-size:12px;color:#666">
        PKH Servicios S.A.S — Sistema de Gestión
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"PKH Servicios" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    subject: `⚠️ PKH Alertas — ${dangers.length} críticas, ${warnings.length} advertencias`,
    html
  });

  console.log(`[EMAIL] Resumen enviado a ${process.env.EMAIL_TO}`);
}

module.exports = { enviarResumenAlertas };
