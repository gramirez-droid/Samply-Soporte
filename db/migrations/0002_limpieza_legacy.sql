-- 0002 · Limpieza de columnas legacy + normalización de FKs
--
-- 1) Elimina las columnas del modelo viejo que el código ya no usa:
--    - clientes.email / clientes.password_hash  (el login vive en usuarios_cliente)
--    - tickets.agente_id                         (reemplazada por tickets_agentes)
--    Mientras existían, el viejo schema.sql las usaba para "re-migrar" datos
--    en cada corrida: resucitaba usuarios borrados y re-asignaba tickets.
--    Sin las columnas, ese riesgo desaparece para siempre.
--
-- 2) Re-asegura que las FKs hacia agentes/usuarios_cliente sean
--    ON DELETE SET NULL, por si en producción alguna quedó con el default
--    (NO ACTION) y bloquea el "Eliminar" del panel.

ALTER TABLE clientes DROP COLUMN IF EXISTS email;
ALTER TABLE clientes DROP COLUMN IF EXISTS password_hash;

DROP INDEX IF EXISTS idx_tickets_agente;
ALTER TABLE tickets DROP COLUMN IF EXISTS agente_id;  -- arrastra su FK

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_usuario_id_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios_cliente(id) ON DELETE SET NULL;

ALTER TABLE tickets_adjuntos DROP CONSTRAINT IF EXISTS tickets_adjuntos_agente_id_fkey;
ALTER TABLE tickets_adjuntos ADD CONSTRAINT tickets_adjuntos_agente_id_fkey
  FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE SET NULL;

ALTER TABLE tickets_adjuntos DROP CONSTRAINT IF EXISTS tickets_adjuntos_usuario_id_fkey;
ALTER TABLE tickets_adjuntos ADD CONSTRAINT tickets_adjuntos_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios_cliente(id) ON DELETE SET NULL;

ALTER TABLE tickets_respuestas DROP CONSTRAINT IF EXISTS tickets_respuestas_agente_id_fkey;
ALTER TABLE tickets_respuestas ADD CONSTRAINT tickets_respuestas_agente_id_fkey
  FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE SET NULL;

ALTER TABLE tickets_respuestas DROP CONSTRAINT IF EXISTS tickets_respuestas_usuario_id_fkey;
ALTER TABLE tickets_respuestas ADD CONSTRAINT tickets_respuestas_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios_cliente(id) ON DELETE SET NULL;
