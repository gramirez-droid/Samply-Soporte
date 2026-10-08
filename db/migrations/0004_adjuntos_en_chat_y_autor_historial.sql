-- 0004 · Archivos dentro de la conversación + autor en el historial
--
-- 1) Un mensaje del chat ahora puede llevar un archivo (imagen o PDF),
--    además de texto y/o audio. El archivo vive en Netlify Blobs, como los
--    audios; acá guardamos el link y el nombre original.
-- 2) El historial guarda QUÉ agente hizo cada cambio, para que la
--    conversación pueda decir "Gonzalo cambió el estado a En progreso".
--    Los cambios viejos quedan sin autor (NULL) y se muestran como "Soporte".

ALTER TABLE tickets_respuestas ADD COLUMN adjunto_url VARCHAR(1000);
ALTER TABLE tickets_respuestas ADD COLUMN adjunto_nombre VARCHAR(255);

ALTER TABLE tickets_respuestas DROP CONSTRAINT chk_respuesta_contenido;
ALTER TABLE tickets_respuestas ADD CONSTRAINT chk_respuesta_contenido
  CHECK (COALESCE(btrim(mensaje), '') <> '' OR audio_url IS NOT NULL OR adjunto_url IS NOT NULL);

ALTER TABLE tickets_historial ADD COLUMN agente_id INTEGER
  REFERENCES agentes(id) ON DELETE SET NULL;
