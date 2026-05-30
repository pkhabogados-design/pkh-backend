-- ============================================================
-- MIGRACIÓN 002 — Sistema de alertas y logs
-- ============================================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id               SERIAL PRIMARY KEY,
  tipo             VARCHAR(50) NOT NULL,
  titulo           VARCHAR(200) NOT NULL,
  mensaje          TEXT,
  referencia_tipo  VARCHAR(50),
  referencia_id    INTEGER,
  nivel            VARCHAR(20) DEFAULT 'info',
  leida            BOOLEAN DEFAULT FALSE,
  email_enviado    BOOLEAN DEFAULT FALSE,
  fecha_generacion TIMESTAMP DEFAULT NOW(),
  fecha_ref        DATE
);

CREATE TABLE IF NOT EXISTS facturacion_masiva_log (
  id                 SERIAL PRIMARY KEY,
  periodo_mes        INTEGER,
  periodo_anio       INTEGER,
  facturas_generadas INTEGER DEFAULT 0,
  total_facturado    DECIMAL(15,2) DEFAULT 0,
  detalle            JSONB DEFAULT '[]',
  ejecutado_en       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notif_nivel ON notificaciones(nivel);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_venc ON facturas(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_docs_venc ON documentos(fecha_vencimiento);
