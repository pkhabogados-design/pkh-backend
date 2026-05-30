// ============================================================
// Email Service — usa Resend.com (HTTP API, sin problemas SMTP)
// ============================================================

async function enviarResumenAlertas(alertas) {
  if (!process.env.RESEND_API_KEY) {
    console.log('[EMAIL] RESEND_API_KEY no configurado — omitiendo envío');
    return;
  }
  if (!alertas || alertas.length === 0) return;

  const dangers = alertas.filter(a => a.nivel === 'danger');
  const warnings = alertas.filter(a => a.nivel === 'warning');
  const infos    = alertas.filter(a => a.nivel === 'info');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#111827">
      <div style="background:#1D3557;color:white;padding:24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:20px">🔔 PKH Servicios — Alertas del día</h2>
        <p style="margin:6px 0 0;opacity:.8;font-size:13px">${new Date().toLocaleDateString('es-AR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
      </div>

      ${dangers.length ? `
      <div style="padding:16px 20px;background:#fef2f2;border-left:4px solid #E24B4A;margin-top:2px">
        <h3 style="color:#E24B4A;margin:0 0 12px;font-size:15px">🔴 Críticas (${dangers.length})</h3>
        ${dangers.map(a => `
          <div style="margin-bottom:10px;padding:10px 14px;background:white;border-radius:6px;border-left:3px solid #E24B4A">
            <div style="font-weight:600;font-size:13px">${a.titulo}</div>
            <div style="color:#6b7280;font-size:12px;margin-top:3px">${a.mensaje||''}</div>
          </div>`).join('')}
      </div>` : ''}

      ${warnings.length ? `
      <div style="padding:16px 20px;background:#fffbeb;border-left:4px solid #BA7517;margin-top:2px">
        <h3 style="color:#BA7517;margin:0 0 12px;font-size:15px">🟡 Advertencias (${warnings.length})</h3>
        ${warnings.map(a => `
          <div style="margin-bottom:10px;padding:10px 14px;background:white;border-radius:6px;border-left:3px solid #BA7517">
            <div style="font-weight:600;font-size:13px">${a.titulo}</div>
            <div style="color:#6b7280;font-size:12px;margin-top:3px">${a.mensaje||''}</div>
          </div>`).join('')}
      </div>` : ''}

      ${infos.length ? `
      <div style="padding:16px 20px;background:#EEF4FF;border-left:4px solid #1D3557;margin-top:2px">
        <h3 style="color:#1D3557;margin:0 0 12px;font-size:15px">ℹ️ Info (${infos.length})</h3>
        ${infos.map(a => `
          <div style="margin-bottom:10px;padding:10px 14px;background:white;border-radius:6px">
            <div style="font-weight:600;font-size:13px">${a.titulo}</div>
            <div style="color:#6b7280;font-size:12px;margin-top:3px">${a.mensaje||''}</div>
          </div>`).join('')}
      </div>` : ''}

      <div style="padding:14px 20px;background:#f3f4f6;text-align:center;font-size:11px;color:#6b7280;border-radius:0 0 8px 8px;margin-top:2px">
        PKH Servicios S.A.S — Sistema de Gestión Integral<br>
        Este email fue generado automáticamente. No responder.
      </div>
    </div>
  `;

  const emailTo = process.env.EMAIL_TO || 'pkhabogados@gmail.com';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'PKH Servicios <onboarding@resend.dev>',
      to: [emailTo],
      subject: `⚠️ PKH Alertas — ${dangers.length} críticas, ${warnings.length} advertencias`,
      html
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));

  console.log(`[EMAIL] Resend OK → id: ${data.id} → ${emailTo}`);
  return data;
}

module.exports = { enviarResumenAlertas };
