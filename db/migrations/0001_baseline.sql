-- 0001 · Baseline
-- Foto del schema tal como estaba en producción (Neon) al 2026-10-08,
-- antes del refactor. Solo estructura: sin UPDATE/INSERT de datos.
--
-- En una base NUEVA se ejecuta normal. En una base que YA tiene las tablas
-- (producción), db/migrate.mjs la marca como aplicada sin ejecutarla.

CREATE TABLE clientes (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE,      -- legacy, se elimina en 0002
  password_hash VARCHAR(255),             -- legacy, se elimina en 0002
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usuarios_cliente (
  id            SERIAL PRIMARY KEY,
  cliente_id    INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre        VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usuarios_cliente_cliente ON usuarios_cliente (cliente_id);

CREATE TABLE agentes (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE ticket_codigo_seq START 1043;

CREATE TABLE tickets (
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
  ai_resumen           TEXT,
  notion_page_id       VARCHAR(255),
  primera_respuesta_en TIMESTAMPTZ,       -- TTO
  resuelto_en          TIMESTAMPTZ,       -- TTR
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  agente_id            INTEGER,           -- legacy (reemplazado por tickets_agentes), se elimina en 0002
  usuario_id           INTEGER,

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
  )),
  CONSTRAINT tickets_agente_id_fkey  FOREIGN KEY (agente_id)  REFERENCES agentes(id)          ON DELETE SET NULL,
  CONSTRAINT tickets_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios_cliente(id) ON DELETE SET NULL
);
CREATE INDEX idx_tickets_cliente ON tickets (cliente_id);
CREATE INDEX idx_tickets_estado  ON tickets (estado);
CREATE INDEX idx_tickets_fecha   ON tickets (fecha_creacion DESC);
CREATE INDEX idx_tickets_usuario ON tickets (usuario_id);
CREATE INDEX idx_tickets_agente  ON tickets (agente_id);

CREATE TABLE tickets_historial (
  id              SERIAL PRIMARY KEY,
  ticket_id       INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  campo           VARCHAR(50) NOT NULL,
  valor_anterior  VARCHAR(100),
  valor_nuevo     VARCHAR(100) NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_historial_ticket ON tickets_historial (ticket_id);

CREATE TABLE tickets_adjuntos (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  nombre       VARCHAR(255) NOT NULL,
  url          VARCHAR(1000) NOT NULL,
  agente_id    INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id   INTEGER REFERENCES usuarios_cliente(id) ON DELETE SET NULL,
  CONSTRAINT tickets_adjuntos_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE SET NULL
);
CREATE INDEX idx_adjuntos_ticket ON tickets_adjuntos (ticket_id);

CREATE TABLE manuales (
  id           SERIAL PRIMARY KEY,
  titulo       VARCHAR(255) NOT NULL,
  descripcion  TEXT,
  modulo       VARCHAR(100) NOT NULL,
  rol          VARCHAR(100) NOT NULL DEFAULT 'Todos los perfiles',
  archivo_url  VARCHAR(500) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_manual_modulo CHECK (modulo IN (
    'App móvil (Preventa)', 'Televentas', 'B2B eCommerce',
    'Inventarios', 'Facturación', 'Reportería / KPIs'
  )),
  CONSTRAINT chk_manual_rol CHECK (rol IN (
    'Todos los perfiles', 'Administrador', 'Vendedor / Preventista', 'Cobrador', 'Entregador'
  ))
);
CREATE INDEX idx_manuales_modulo ON manuales (modulo);
CREATE INDEX idx_manuales_rol    ON manuales (rol);

CREATE TABLE tickets_respuestas (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agente_id   INTEGER,
  mensaje     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id  INTEGER,
  CONSTRAINT tickets_respuestas_agente_id_fkey  FOREIGN KEY (agente_id)  REFERENCES agentes(id)          ON DELETE SET NULL,
  CONSTRAINT tickets_respuestas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios_cliente(id) ON DELETE SET NULL
);
CREATE INDEX idx_respuestas_ticket ON tickets_respuestas (ticket_id);

CREATE TABLE notificacion_emails (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tickets_agentes (
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agente_id    INTEGER NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
  asignado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, agente_id)
);
CREATE INDEX idx_tickets_agentes_ticket ON tickets_agentes (ticket_id);
CREATE INDEX idx_tickets_agentes_agente ON tickets_agentes (agente_id);
