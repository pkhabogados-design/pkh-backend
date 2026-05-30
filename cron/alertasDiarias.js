const cron = require('node-cron');
const { escanearAlertas }     = require('../services/alertasService');
const { enviarResumenAlertas } = require('../services/emailService');

// Corre todos los días a las 08:00 AM (hora Argentina = UTC-3)
// '0 11 * * *' = 11:00 UTC = 08:00 ART
function iniciarCron() {
  cron.schedule('0 11 * * *', async () => {
    console.log('[CRON] Ejecutando escaneo diario de alertas...');
    try {
      const resultado = await escanearAlertas();
      if (resultado.alertas.length > 0) {
        await enviarResumenAlertas(resultado.alertas);
      }
    } catch (err) {
      console.error('[CRON] Error en escaneo:', err.message);
    }
  }, { timezone: 'America/Argentina/Buenos_Aires' });

  console.log('[CRON] ✓ Alertas diarias programadas (08:00 ART)');
}

module.exports = { iniciarCron };
