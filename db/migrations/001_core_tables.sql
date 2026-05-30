-- ============================================================
-- MIGRACIÓN 001 — Tablas core PKH Servicios
-- ============================================================

CREATE TABLE IF NOT EXISTS flota (
  id            VARCHAR(20) PRIMARY KEY,
  pat           VARCHAR(20) NOT NULL,
  tipo          VARCHAR(20) DEFAULT 'propia',
  cliente       VARCHAR(200),
  fecha_entrega DATE,
  km_entrega    INTEGER DEFAULT 0,
  modelo        VARCHAR(100),
  anio          INTEGER,
  valor         DECIMAL(15,2) DEFAULT 0,
  notas         TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contratos (
  id              SERIAL PRIMARY KEY,
  empresa         VARCHAR(200) NOT NULL,
  patente         VARCHAR(20) REFERENCES flota(id) ON DELETE SET NULL,
  precio_neto     DECIMAL(15,2) NOT NULL DEFAULT 0,
  iva             DECIMAL(5,4) DEFAULT 0.21,
  fecha_inicio    DATE,
  fecha_fin       DATE,
  dia_facturacion INTEGER DEFAULT 1,
  estado          VARCHAR(20) DEFAULT 'activo',
  km_tope_mensual INTEGER,
  observaciones   TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facturas (
  id                SERIAL PRIMARY KEY,
  numero            VARCHAR(20),
  fecha_emision     DATE NOT NULL,
  empresa           VARCHAR(200) NOT NULL,
  cuit              VARCHAR(20),
  monto_neto        DECIMAL(15,2) DEFAULT 0,
  iva               DECIMAL(15,2) DEFAULT 0,
  total             DECIMAL(15,2) DEFAULT 0,
  fecha_vencimiento DATE,
  estado            VARCHAR(20) DEFAULT 'pendiente',
  fecha_pago        DATE,
  forma_pago        VARCHAR(200),
  observaciones     TEXT,
  contrato_id       INTEGER REFERENCES contratos(id) ON DELETE SET NULL,
  periodo_mes       INTEGER,
  periodo_anio      INTEGER,
  generada_auto     BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS km_registros (
  id         SERIAL PRIMARY KEY,
  patente    VARCHAR(20) REFERENCES flota(id) ON DELETE CASCADE,
  mes        VARCHAR(20) NOT NULL,
  anio       VARCHAR(4)  NOT NULL,
  km         INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(patente, mes, anio)
);

CREATE TABLE IF NOT EXISTS documentos (
  id                SERIAL PRIMARY KEY,
  patente           VARCHAR(30) DEFAULT 'SOCIEDAD',
  tipo              VARCHAR(50),
  fecha_vencimiento DATE,
  proveedor         VARCHAR(200),
  costo_anual       DECIMAL(15,2) DEFAULT 0,
  notas             TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cheques (
  id          SERIAL PRIMARY KEY,
  numero      VARCHAR(50),
  banco       VARCHAR(100),
  empresa     VARCHAR(200),
  monto       DECIMAL(15,2) DEFAULT 0,
  fecha_cobro DATE,
  factura_num VARCHAR(20),
  estado      VARCHAR(20) DEFAULT 'pendiente',
  fecha_cobrado DATE,
  observaciones TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos (
  id                  SERIAL PRIMARY KEY,
  concepto            TEXT         NOT NULL,
  fecha               DATE         NOT NULL,
  monto               DECIMAL(15,2) NOT NULL DEFAULT 0,
  origen              VARCHAR(100),
  categoria           VARCHAR(50),
  movimiento_banco_id INTEGER,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homebanking_movimientos (
  id                   SERIAL PRIMARY KEY,
  fecha                DATE,
  descripcion          TEXT,
  origen               VARCHAR(100),
  debito               DECIMAL(15,2) DEFAULT 0,
  credito              DECIMAL(15,2) DEFAULT 0,
  grupo_concepto       VARCHAR(100),
  concepto             VARCHAR(200),
  numero_comprobante   VARCHAR(100) UNIQUE,
  tipo_movimiento      VARCHAR(50),
  saldo                DECIMAL(15,2),
  categoria            VARCHAR(50),
  estado_clasificacion VARCHAR(20) DEFAULT 'sin_clasificar',
  gasto_id             INTEGER REFERENCES gastos(id) ON DELETE SET NULL,
  created_at           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS socios (
  id        SERIAL PRIMARY KEY,
  nombre    VARCHAR(200) NOT NULL,
  porcentaje DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aportes (
  id        SERIAL PRIMARY KEY,
  socio     VARCHAR(200),
  concepto  TEXT,
  monto     DECIMAL(15,2) DEFAULT 0,
  monto_usd DECIMAL(15,2) DEFAULT 0,
  fecha     DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS costos_mensuales (
  id         SERIAL PRIMARY KEY,
  periodo    VARCHAR(10) UNIQUE NOT NULL,
  vars       JSONB DEFAULT '[]',
  fijos      JSONB DEFAULT '[]',
  imp        JSONB DEFAULT '[]',
  ing        JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mantenimiento (
  id        SERIAL PRIMARY KEY,
  patente   VARCHAR(20) REFERENCES flota(id) ON DELETE SET NULL,
  tipo      VARCHAR(100),
  fecha     DATE,
  km        INTEGER DEFAULT 0,
  prox_km   INTEGER DEFAULT 0,
  costo     DECIMAL(15,2) DEFAULT 0,
  taller    VARCHAR(200),
  obs       TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
