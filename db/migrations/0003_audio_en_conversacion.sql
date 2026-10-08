-- 0003 · Audios en la conversación del ticket
--
-- Un mensaje del chat ahora puede ser texto, audio, o ambos.
-- El archivo vive en Netlify Blobs (igual que los adjuntos); acá guardamos
-- el link y la duración (los .webm que graba Chrome no traen la duración
-- en el archivo, por eso la registramos al grabar).

ALTER TABLE tickets_respuestas ALTER COLUMN mensaje DROP NOT NULL;
ALTER TABLE tickets_respuestas ADD COLUMN audio_url VARCHAR(1000);
ALTER TABLE tickets_respuestas ADD COLUMN audio_duracion_seg INTEGER;

-- Nunca un mensaje vacío: o tiene texto, o tiene audio.
ALTER TABLE tickets_respuestas ADD CONSTRAINT chk_respuesta_contenido
  CHECK (COALESCE(btrim(mensaje), '') <> '' OR audio_url IS NOT NULL);

ALTER TABLE tickets_respuestas ADD CONSTRAINT chk_respuesta_duracion
  CHECK (audio_duracion_seg IS NULL OR audio_duracion_seg BETWEEN 0 AND 600);
