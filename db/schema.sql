-- Samply · Panel de Soporte — Fase 1 (CRUD + auth)
-- Ejecutar con: npm run db:migrate

CREATE TABLE IF NOT EXISTS clientes (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Secuencia para los códigos visibles TCK-1043, TCK-1044... (arranca donde
-- termina el prototipo, que llegaba hasta TCK-1042).
CREATE SEQUENCE IF NOT EXISTS ticket_codigo_seq START 1043;

CREATE TABLE IF NOT EXISTS tickets (
  id                   SERIAL PRIMARY KEY,
  codigo               VARCHAR(20) UNIQUE NOT NULL,
  asunto               VARCHAR(255) NOT NULL,
  descripcion          TEXT,
  categoria            VARCHAR(100) NOT NULL,
  modulo               VARCHAR(100) NOT NULL,
  prioridad            VARCHAR(20)  NOT NULL DEFAULT 'Media',
  estado               VARCHAR(30)  NOT NULL DEFAULT 'Nuevo',
  cliente_id           INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ai_resumen           TEXT,               -- se completa en Fase 2 (Claude API)
  notion_page_id       VARCHAR(255),       -- se completa en Fase 3 (sync Notion)

  -- SLA estilo iTop (TTO/TTR):
  -- primera_respuesta_en = TTO (Time To Own) — cuándo el ticket pasó a "Asignado"
  -- resuelto_en          = TTR (Time To Resolve) — cuándo pasó a "Resuelto"
  -- Umbrales (definidos en components/support/constants.js, no en la DB):
  --   toma       (TTO) máx. 1 día  (24h)  → verde si está dentro, rojo si no
  --   resolución (TTR) máx. 7 días (168h) → verde si está dentro, rojo si no
  primera_respuesta_en TIMESTAMPTZ,
  resuelto_en          TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_categoria CHECK (categoria IN (
    'Bug / error', 'Consulta funcional', 'Integración (ERP)',
    'Facturación', 'Capacitación', 'Solicitud de mejora'
  )),
  CONSTRAINT chk_modulo CHECK (modulo IN (
    'App móvil (Preventa)', 'Televentas', 'B2B eCommerce',
    'Inventarios', 'Facturación', 'Reportería / KPIs'
  )),
  CONSTRAINT chk_prioridad CHECK (prioridad IN ('Baja', 'Media', 'Alta', 'Urgente')),
  CONSTRAINT chk_estado CHECK (estado IN (
    'Nuevo', 'Asignado', 'En progreso', 'Esperando cliente', 'Resuelto', 'Cerrado'
  ))
);

CREATE INDEX IF NOT EXISTS idx_tickets_cliente ON tickets (cliente_id);
CREATE INDEX IF NOT EXISTS idx_tickets_estado   ON tickets (estado);
CREATE INDEX IF NOT EXISTS idx_tickets_fecha    ON tickets (fecha_creacion DESC);

-- Por si ya habías corrido esta migración antes de que existieran estas
-- columnas: CREATE TABLE IF NOT EXISTS no las agrega a una tabla que ya
-- existe, así que las sumamos explícitamente (es seguro correrlo de nuevo).
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS primera_respuesta_en TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resuelto_en          TIMESTAMPTZ;

-- Ciclo de vida definitivo (reemplaza la primera versión que tenía
-- "En análisis IA"): Nuevo → Asignado → En progreso → Esperando cliente →
-- Resuelto → Cerrado (este último, automático a los 3 días de "Resuelto"
-- si el cliente no responde — ver lib/tickets.js).
-- "En progreso" es el estado que va a disparar la creación del ticket en
-- Notion; "Resuelto" es el que Notion va a setear automáticamente cuando
-- el ticket llegue a "Validación Customer" del lado de ustedes.
UPDATE tickets SET estado = 'Asignado' WHERE estado = 'En análisis IA';
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_estado;
ALTER TABLE tickets ADD CONSTRAINT chk_estado CHECK (estado IN (
  'Nuevo', 'Asignado', 'En progreso', 'Esperando cliente', 'Resuelto', 'Cerrado'
));

-- Historial de cambios del ticket (estado/prioridad) — trazabilidad tipo
-- iTop/Freshdesk: quién cambió qué y cuándo. Por ahora "quién" es siempre el
-- cliente logueado, porque no existe todavía un rol de staff Samply separado.
CREATE TABLE IF NOT EXISTS tickets_historial (
  id              SERIAL PRIMARY KEY,
  ticket_id       INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  campo           VARCHAR(50) NOT NULL,   -- 'estado' | 'prioridad'
  valor_anterior  VARCHAR(100),
  valor_nuevo     VARCHAR(100) NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_ticket ON tickets_historial (ticket_id);

-- Agentes de soporte (staff Samply) — quienes TOMAN los tickets. Login
-- separado del cliente (ver lib/auth.js / middleware.js: sesión distinta,
-- cookie distinta). Arranca con los 3 que pediste.
CREATE TABLE IF NOT EXISTS agentes (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A qué agente está asignado el ticket. Se completa cuando el ticket pasa a
-- "Asignado" — es lo que responde "quién tomó la solicitud".
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS agente_id INTEGER REFERENCES agentes(id);
CREATE INDEX IF NOT EXISTS idx_tickets_agente ON tickets (agente_id);

-- Adjuntos del ticket. Por ahora son URLs (Google Drive, etc.), no upload
-- de archivo real — no tenemos todavía un bucket de storage configurado
-- (Vercel Blob o S3). Lo dejamos preparado para cuando lo sumemos.
CREATE TABLE IF NOT EXISTS tickets_adjuntos (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  nombre       VARCHAR(255) NOT NULL,
  url          VARCHAR(1000) NOT NULL,
  agente_id    INTEGER REFERENCES agentes(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adjuntos_ticket ON tickets_adjuntos (ticket_id);

-- Centro de Ayuda — manuales en PDF, globales (no por cliente: son guías de
-- uso del producto, no datos de cuenta). Se cargan por script/seed por ahora
-- (ver db/seed_manuales.mjs); no hay upload desde la UI en esta fase porque
-- no existe todavía un rol de staff Samply separado del cliente.
CREATE TABLE IF NOT EXISTS manuales (
  id           SERIAL PRIMARY KEY,
  titulo       VARCHAR(255) NOT NULL,
  descripcion  TEXT,
  modulo       VARCHAR(100) NOT NULL,
  rol          VARCHAR(100) NOT NULL DEFAULT 'Todos los perfiles',
  archivo_url  VARCHAR(500) NOT NULL,  -- ruta relativa en /public/manuales/ o URL externa
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_manual_modulo CHECK (modulo IN (
    'App móvil (Preventa)', 'Televentas', 'B2B eCommerce',
    'Inventarios', 'Facturación', 'Reportería / KPIs'
  )),
  CONSTRAINT chk_manual_rol CHECK (rol IN (
    'Todos los perfiles', 'Administrador', 'Vendedor / Preventista', 'Cobrador', 'Entregador'
  ))
);

CREATE INDEX IF NOT EXISTS idx_manuales_modulo ON manuales (modulo);
CREATE INDEX IF NOT EXISTS idx_manuales_rol    ON manuales (rol);
