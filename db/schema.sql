-- Samply · Panel de Soporte — Fase 1 (CRUD + auth)
-- Ejecutar con: npm run db:migrate

CREATE TABLE IF NOT EXISTS clientes (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Por si ya tenías la tabla creada de antes sin esta columna.
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

-- `clientes` ahora es solo la EMPRESA (nombre, activo) — el login individual
-- se mudó a `usuarios_cliente`. email/password_hash quedan nullable acá por
-- compatibilidad con filas viejas, pero el código ya no los usa para nada.
ALTER TABLE clientes ALTER COLUMN email DROP NOT NULL;
ALTER TABLE clientes ALTER COLUMN password_hash DROP NOT NULL;

-- Una empresa puede tener VARIOS usuarios levantando tickets (no un solo
-- login compartido). Cada usuario pertenece a una empresa; el email es
-- único en todo el sistema (una persona = una cuenta).
CREATE TABLE IF NOT EXISTS usuarios_cliente (
  id            SERIAL PRIMARY KEY,
  cliente_id    INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre        VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_cliente_cliente ON usuarios_cliente (cliente_id);

-- Migramos los logins que ya existían directo en `clientes` (email +
-- password_hash) a `usuarios_cliente`, uno por cada empresa — así nadie
-- pierde el acceso que ya tenía. A partir de ahora el login se valida
-- contra esta tabla, no contra `clientes`.
INSERT INTO usuarios_cliente (cliente_id, nombre, email, password_hash, activo)
SELECT id, nombre, email, password_hash, activo
FROM clientes
WHERE email IS NOT NULL AND password_hash IS NOT NULL
ON CONFLICT (email) DO NOTHING;

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

-- Qué usuario PUNTUAL de la empresa levantó este ticket (una empresa puede
-- tener varios usuarios — esto es lo que responde "quién exactamente").
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios_cliente(id);
CREATE INDEX IF NOT EXISTS idx_tickets_usuario ON tickets (usuario_id);

-- Para los tickets que ya existían antes de este cambio (no tenían
-- usuario_id todavía): los asociamos al primer usuario migrado de su
-- misma empresa, así no quedan huérfanos.
UPDATE tickets t
SET usuario_id = uc.id
FROM usuarios_cliente uc
WHERE uc.cliente_id = t.cliente_id AND t.usuario_id IS NULL;

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

-- Hilo de conversación del ticket — tipo chat, en orden cronológico.
-- Cada fila la escribió el staff (agente_id) O un usuario del cliente
-- (usuario_id), nunca ambos. Dispara email a la otra parte según quién
-- escribió (si escribe el staff, le avisa al cliente; si escribe el
-- cliente, le avisa al staff).
CREATE TABLE IF NOT EXISTS tickets_respuestas (
  id          SERIAL PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agente_id   INTEGER REFERENCES agentes(id),
  mensaje     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_respuestas_ticket ON tickets_respuestas (ticket_id);

-- Por si ya tenías la tabla creada de antes de que el cliente pudiera
-- responder (era de un solo sentido: staff → cliente).
ALTER TABLE tickets_respuestas ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios_cliente(id);

-- Un ticket puede tener VARIOS agentes trabajando en él (no solo uno) — es
-- una relación muchos a muchos, no la columna tickets.agente_id de antes
-- (que queda en la tabla sin usarse, por compatibilidad, pero el código ya
-- no la lee ni la escribe). Todos los agentes asignados son "pares", sin
-- uno "principal" por encima de los demás.
CREATE TABLE IF NOT EXISTS tickets_agentes (
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agente_id    INTEGER NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
  asignado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ticket_id, agente_id)
);

CREATE INDEX IF NOT EXISTS idx_tickets_agentes_ticket ON tickets_agentes (ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agentes_agente ON tickets_agentes (agente_id);

-- Migramos las asignaciones que ya existían en tickets.agente_id (single)
-- a la tabla nueva, para no perder lo que ya estaba asignado.
INSERT INTO tickets_agentes (ticket_id, agente_id)
SELECT id, agente_id FROM tickets WHERE agente_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Para poder BORRAR un agente o un usuario de cliente de verdad (no solo
-- desactivarlo) sin que se rompa el historial: si se borra a alguien que ya
-- dejó un mensaje o quedó asignado a un ticket, esas filas se quedan (no se
-- pierde el ticket ni la conversación) pero la referencia pasa a NULL — la
-- UI lo muestra como "Agente eliminado" / "Usuario eliminado" en vez de
-- romper. Por default Postgres bloquea el borrado (NO ACTION); lo cambiamos
-- a SET NULL en las 5 relaciones que apuntan a agentes/usuarios_cliente
-- (excepto tickets_agentes, que ya es ON DELETE CASCADE a propósito: ahí sí
-- tiene sentido que la fila de asignación desaparezca del todo).
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_agente_id_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_agente_id_fkey
  FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE SET NULL;

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_usuario_id_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios_cliente(id) ON DELETE SET NULL;

ALTER TABLE tickets_adjuntos DROP CONSTRAINT IF EXISTS tickets_adjuntos_agente_id_fkey;
ALTER TABLE tickets_adjuntos ADD CONSTRAINT tickets_adjuntos_agente_id_fkey
  FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE SET NULL;

ALTER TABLE tickets_respuestas DROP CONSTRAINT IF EXISTS tickets_respuestas_agente_id_fkey;
ALTER TABLE tickets_respuestas ADD CONSTRAINT tickets_respuestas_agente_id_fkey
  FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE SET NULL;

ALTER TABLE tickets_respuestas DROP CONSTRAINT IF EXISTS tickets_respuestas_usuario_id_fkey;
ALTER TABLE tickets_respuestas ADD CONSTRAINT tickets_respuestas_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios_cliente(id) ON DELETE SET NULL;
