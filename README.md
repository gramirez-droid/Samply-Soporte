# Samply · Panel de Soporte — Fase 1 (CRUD + auth)

Panel **standalone** de soporte (no vive dentro del Backoffice completo de
Samply — es su propio link). Migración del prototipo `ui_kits/support/` a
Next.js + Postgres, siguiendo `BRIEFING_SAMPLY_SOPORTE.md`. Cubre la
**Fase 1**: scaffold, auth, modelo de datos, CRUD real de tickets, y un
Centro de Ayuda con manuales en PDF. Fase 2 (IA) y Fase 3 (Notion) quedan
para las próximas iteraciones.

## Cómo levantarlo

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Variables de entorno** — copiá `.env.example` a `.env` y completá:
   - `DATABASE_URL`: connection string de tu Postgres (Supabase o Neon, plan gratis)
   - `AUTH_SECRET`: generar con `openssl rand -base64 32`
   - `ANTHROPIC_API_KEY` y las de Notion quedan para Fase 2 y 3, no hacen falta todavía

3. **Crear las tablas**
   ```bash
   npm run db:migrate
   ```

4. **(Opcional) Crear un cliente demo para probar el login**
   ```bash
   npm run db:seed
   ```
   Esto crea `demo@distribuidoramodelo.com` / `samply123`. Podés cambiar
   nombre/email/password con las variables `SEED_NOMBRE`, `SEED_EMAIL`,
   `SEED_PASSWORD` antes de correr el comando.

5. **(Opcional) Cargar manuales de ejemplo para el Centro de Ayuda**
   ```bash
   npm run db:seed:manuales
   ```
   Esto inserta 6 filas de ejemplo en la tabla `manuales`. Los PDF reales
   van en `public/manuales/` — ver el punto siguiente.

6. **Levantar en desarrollo**
   ```bash
   npm run dev
   ```
   Entrá a `http://localhost:3000` — te va a redirigir a `/login`.

## Qué quedó armado

- **Auth**: JWT en cookie httpOnly (`lib/auth.js` + `middleware.js`), sin
  dependencias externas de auth (no usamos NextAuth para mantenerlo simple).
  Protege `/soporte`, `/api/tickets/*` y `/api/manuales`.
- **DB**: `db/schema.sql` con las tablas `clientes`, `tickets`, `manuales` y
  `tickets_historial`. `manuales` es global (no tiene `cliente_id`) porque son
  guías de uso del producto, no datos de cuenta.
- **API**: `GET/POST /api/tickets`, `PATCH /api/tickets/:id`,
  `GET /api/tickets/:id/historial`, `GET /api/manuales` (con filtros
  `?modulo=` y `?rol=`), `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/me`.
- **UI**: el design system completo portado a componentes reales de React en
  `components/ds/` (extraído directamente del `_ds_bundle.js` que mandaste,
  no reescrito a mano, para no introducir diferencias visuales). El panel
  tiene dos secciones navegables desde el Sidebar: **Tickets**
  (`components/support/TicketsScreen.jsx`) y **Centro de ayuda**
  (`components/support/CentroAyudaScreen.jsx`). `components/support/SupportApp.jsx`
  es el que decide cuál mostrar.

## SLA (TTO/TTR) e historial — inspirado en cómo lo resuelve iTop

Investigué iTop (y de paso Freshdesk/Zoho Desk) para robustecer el panel.
Tres cosas de ahí quedaron incorporadas:

1. **SLA real (TTO/TTR)**: `tickets.primera_respuesta_en` marca la primera
   vez que el ticket sale de "Nuevo" (equivalente al *Time To Own* de iTop) y
   `tickets.resuelto_en` marca cuándo llega a "Resuelto" (*Time To Resolve*).
   Ambos se setean una sola vez — un cambio de prioridad posterior no los
   pisa. El KPI "Tiempo prom. respuesta" en `TicketsScreen` ahora es el
   promedio real de TTO en vez del placeholder `—`, y el modal de detalle
   muestra ambos tiempos cuando existen.
2. **Historial de cambios** (`tickets_historial`): cada cambio de `estado` o
   `prioridad` vía `PATCH /api/tickets/:id` queda registrado con valor
   anterior, valor nuevo y timestamp. Se ve como una mini timeline en el
   modal de detalle (`GET /api/tickets/:id/historial`, cargado al abrir el
   modal).
3. **Buscador de texto libre en el Centro de Ayuda**: filtra por título o
   descripción del manual, además de los filtros por módulo y rol que ya
   había.

Lo que **no** traje de iTop porque no aplica a este producto: CMDB (gestión
de inventario de hardware/infraestructura), Gestión de Cambios, gestión de
contratos con proveedores — eso es para un departamento de IT gestionando su
propia infraestructura, no para soporte de un SaaS a sus clientes.

## Centro de ayuda — cómo cargar manuales

Por ahora no hay upload desde la UI (no existe todavía un rol de staff
Samply separado del cliente que justifique ese botón). El flujo es:

1. Poné el PDF real en `public/manuales/nombre-del-archivo.pdf`.
2. Insertá una fila en la tabla `manuales` con ese `archivo_url`
   (ver `db/seed_manuales.mjs` como ejemplo, o hacelo por SQL directo).

Los manuales se pueden tagear por **módulo** (misma taxonomía que los
tickets) y por **rol**: `Administrador`, `Vendedor / Preventista`,
`Cobrador`, `Entregador`, o `Todos los perfiles`. Si tu nomenclatura interna
de roles es otra, es un cambio de una línea en el `CHECK` de `db/schema.sql`.

## Decisiones que tomé y que quiero que confirmes

1. **Alcance de los tickets por cliente**: como el login es "cliente con
   email + contraseña", cada cuenta ve únicamente sus propios tickets
   (`cliente_id` en el WHERE de todas las queries). Si en realidad este panel
   lo va a usar el equipo de soporte de Samply viendo los tickets de *todos*
   los clientes, esto cambia — avisame antes de seguir a Fase 2.
2. **"Tiempo prom. respuesta"** quedó como `—` en el KPI: en el prototipo era
   un valor fijo (`4.2h`), pero no tenemos todavía el campo que registre
   cuándo se respondió un ticket. Se puede sumar un `primera_respuesta_at`
   más adelante si querés ese dato real.
3. **Adjuntar captura** y **Editar ticket** quedaron deshabilitados/ocultos
   en los modales — son UI del prototipo sin funcionalidad real todavía
   (subida de archivos no está en el alcance de Fase 1).
4. Actualicé `next` a `14.2.35` (la versión que me pasaste, `14.2.15`, tiene
   una vulnerabilidad de seguridad conocida ya parcheada en 14.2.x).
5. **Roles del Centro de ayuda** los definí yo (ver arriba) porque todavía no
   me pasaste la nomenclatura real — es trivial de cambiar.

## Probado

Corrí el flujo completo local (Postgres real, no mockeado): login con
credenciales buenas/malas, protección de `/soporte`, `/api/tickets` y
`/api/manuales` sin sesión, alta de ticket, cambios de estado que disparan
TTO/TTR correctamente (y confirmé que un cambio de prioridad posterior *no*
los pisa), historial acumulando cada cambio en orden, `/api/manuales` con
filtros de módulo+rol combinados, y `/api/tickets/:id/historial` devolviendo
404 ante un id ajeno/inexistente y 401 sin sesión. Todo respondió como se
espera.

## Ciclo de vida del ticket (definitivo)

```
Nuevo → Asignado → En progreso → Esperando cliente → Resuelto → Cerrado
          ↑TTO         ↑dispara      ↕ (puede volver         ↑TTR    ↑automático
          (máx 1 día)   Notion        a En progreso)    (máx 7 días)  a los 3 días
                                                                       sin respuesta
```

- **Nuevo → Asignado**: mide el TTO (Time To Own, máx. 1 día). Lo dispara
  alguien del equipo tomando el ticket (panel de staff, todavía no construido).
- **En progreso**: este es el estado que, en la integración con Notion (Fase
  siguiente), va a disparar la creación automática de la page en la Notion
  database de soporte.
- **Esperando cliente**: cuando hay una duda y el cliente tiene que
  responder algo antes de seguir. Puede volver a "En progreso".
- **Resuelto**: mide el TTR (Time To Resolve, máx. 7 días). En el flujo con
  Notion, este es el estado que se va a setear automáticamente cuando el
  staff marque el ticket como "Validación Customer" del lado de Notion — no
  es una acción manual en nuestro panel.
- **Cerrado**: automático a los 3 días de estar en "Resuelto" si el cliente
  no dice nada (`lib/tickets.js` → `cerrarTicketsVencidos`, corre como
  chequeo perezoso en cada `GET /api/tickets` — todavía no hay cron real
  porque no está deployado en Vercel).

**Importante**: el panel de cliente (lo que hay hoy) quedó de **solo
lectura** respecto al ciclo de vida — el cliente ve el ticket, el SLA y el
historial, pero no tiene ningún botón para cambiar de estado. Esos cambios
van a venir del panel de staff (todavía no construido) o de la integración
con Notion. La API (`PATCH /api/tickets/:id`) sigue funcionando igual que
antes — lo que se sacó fue el botón en la UI del cliente, no el endpoint —
así que mientras no exista el panel de staff, para probar el flujo completo
hay que dispararlo por API, por ejemplo:

```bash
curl -X PATCH http://localhost:3000/api/tickets/1 \
  -H "Content-Type: application/json" \
  -b "samply_session=<cookie de una sesión logueada>" \
  -d '{"estado":"Asignado"}'
```

## Eliminar de verdad (agentes, empresas, usuarios) — no solo desactivar

Sumado a "Activar/Desactivar" (que ya existía y no borra nada), ahora hay un
botón **"Eliminar"** de verdad en:
- **Agentes** (nav nuevo "Agentes" — antes no había ninguna pantalla para
  crear/gestionar agentes, solo existían los 3 que cargué por script).
- **Empresas**, en la tabla de "Clientes".
- **Usuarios** puntuales, dentro del modal "Usuarios" de cada empresa.

Qué pasa exactamente al eliminar (probado con Postgres real, no solo
compilado):
- **Agente**: se borra de verdad. Si ya había dejado mensajes en algún chat
  o quedado asignado a tickets, esos tickets y mensajes **no se pierden** —
  solo dejan de mostrar su nombre (el mensaje sigue ahí). El aviso antes de
  borrar te dice cuántos tickets tiene o tuvo asignados.
- **Usuario de una empresa**: se borra de verdad. Los tickets que había
  levantado **se quedan en la empresa** (el resto de la empresa los sigue
  viendo) — solo pierden el dato de "quién exactamente" los creó.
- **Empresa completa**: esto sí es destructivo de punta a punta — se borran
  también todos sus usuarios y todos sus tickets (con su historial,
  respuestas y adjuntos). El aviso antes de confirmar te muestra cuántos
  usuarios y tickets tiene, para que no sea una sorpresa. Si preferís no
  perder ese historial, usá "Desactivar" en vez de "Eliminar".

## Empresas con varios usuarios (cambio de modelo)

**Esto reemplaza el modelo anterior** (una empresa = un solo login). Ahora:
- **`clientes`** es solo la **empresa** (nombre, activa/desactivada).
- **`usuarios_cliente`** son las **personas** — cada una con su propio
  nombre, email y contraseña, pertenecientes a una empresa. Una empresa
  puede tener varios usuarios levantando tickets (probado: creé un segundo
  usuario para "Distribuidora Modelo" y ambos ven y crean tickets de la
  misma empresa, cada uno con su propio login).
- Los tickets ahora guardan **quién puntualmente** los levantó
  (`usuario_id`), además de a qué empresa pertenecen (`cliente_id`). El
  staff ve ambos datos en el detalle del ticket ("Distribuidora Modelo —
  levantado por María López").
- **Desactivar la empresa** bloquea a *todos* sus usuarios de una.
  **Desactivar un usuario puntual** (desde el modal "Usuarios" de esa
  empresa) solo lo bloquea a él — el resto de la empresa sigue entrando
  normal. Probé los dos casos por separado.
- En el panel de staff, "Nueva empresa" ahora solo pide el nombre — después
  de crearla se abre directo el modal para agregarle su primer usuario (sin
  usuarios, nadie de esa empresa puede loguearse).
- **Visibilidad de tickets**: todos los usuarios de una misma empresa ven
  todos los tickets de esa empresa (no solo los que ellos mismos crearon)
  — es una cuenta compartida a nivel empresa, no silos por persona. Si en
  algún momento preferís que cada usuario solo vea lo que él mismo creó,
  es un cambio chico en el filtro de `GET /api/tickets` — avisame.

## Panel de staff (`/admin`) — ya construido

Login separado del cliente (tabla `agentes`, cookie distinta). Arranca con
los 3 agentes que pediste — cargalos con:

```bash
npm run db:seed:agentes
```

Esto crea a Tomás Martínez Paisa, Ignacio Ghiorzi y Gonzalo Ramirez con
contraseñas de arranque (quedan impresas en la consola al correr el
comando — cambialas antes de usar esto en serio).

Entrá a `/admin/login`. A diferencia del panel de cliente:
- Ve los tickets de **todos** los clientes (con el nombre de cada uno).
- Puede **asignar un agente**, cambiar **estado** y **prioridad** directo
  desde el modal de detalle (el cliente no puede — ver más abajo).
- Puede agregar **adjuntos** al ticket — por ahora son links (Drive, etc.),
  no upload de archivo real, porque no hay todavía un bucket de storage
  configurado (Vercel Blob o S3 serían el paso siguiente).
- Tiene un botón "**Sincronizar con Notion**" que dispara manualmente la
  sync reversa (ver abajo) — sin cron todavía.
- Tiene una sección **"Clientes"** (nav del sidebar) que ahora maneja
  **empresas y sus usuarios** por separado (ver la sección de arriba). Cada
  fila de empresa tiene botón "Usuarios" (abre el modal para agregar/activar/
  desactivar personas de esa empresa) y botón Activar/Desactivar a nivel
  empresa completa.
- Tiene una sección **"Centro de ayuda"** para cargar, **editar y borrar**
  manuales sin tocar SQL: título, descripción, módulo, perfil, y el link
  del PDF. Lo que se crea/edita ahí aparece de inmediato en el Centro de
  Ayuda del panel de cliente. Sigue siendo por URL, no upload real, mismo
  motivo que los adjuntos de tickets.
- En el detalle de cada ticket hay una sección **"Conversación"** — un chat
  de verdad, en orden cronológico, donde **tanto el staff como el cliente
  pueden escribir** (ya no es de un solo sentido). Cada mensaje dispara un
  email a la otra parte: si escribe el staff, le avisa al cliente; si
  escribe el cliente, le avisa al staff (a `ADMIN_NOTIFICATION_EMAIL`).
  Probado de punta a punta: cliente → staff → cliente, y ambos lados ven
  exactamente el mismo hilo. Bonus: si el ticket estaba en "Esperando
  cliente" y el cliente responde, pasa solo a "En progreso" (queda
  registrado en el historial) — así no se pierde que hay algo nuevo para
  revisar.

- Un ticket puede tener **varios agentes** trabajando en él a la vez — no
  es un dropdown que reemplaza al agente, es una lista: agregás y sacás
  gente sin perder a los que ya estaban asignados. Todos los agentes
  asignados son "pares" (no hay uno "principal" por encima de los demás).
  En la tabla se ven todos los nombres; en el detalle, cada uno con su
  botoncito de sacar + un selector para agregar otro.

### Diseño de los emails

Todos los emails (los 5 de la lista de arriba) usan una plantilla visual
compartida con la identidad de Samply: header navy con el wordmark, franja
de acento de color (celeste para avisos normales, verde para "Resuelto"),
botón de acción, y footer con el pie estándar. Todo en HTML con estilos
inline (necesario para que se vea bien en Gmail/Outlook, que no soportan
bloques `<style>`).

Dos casos tienen contenido especial en vez del genérico "cambió de estado":
- **Al crear el ticket**: "¡Recibimos tu ticket! ... Vamos a tomar el caso
  y te vamos a ir informando el estado a la brevedad."
- **Al resolverlo**: "¡Buenas noticias! Tu ticket ... fue resuelto con
  éxito ✅" (con la franja de acento en verde en vez de celeste).
- **Al cerrarlo**: mensaje de cierre más neutro, invitando a abrir un
  ticket nuevo si surge algo relacionado más adelante.

**Importante:** los botones de esos emails ("Ver mi ticket", "Ver en el
panel") arman el link con la variable `APP_URL` — confirmá que esté
cargada en Netlify con la URL real del sitio
(`https://soportesamply.netlify.app`, sin barra al final), o esos botones
van a apuntar a `localhost:3000` en producción.

## Emails

Cinco emails automáticos, todos con el mismo comportamiento sin
`RESEND_API_KEY` (se simulan en consola, no fallan):
1. Aviso a la lista de "Notificaciones" cuando un cliente crea un ticket.
2. Confirmación al cliente que lo creó, con el número de ticket.
3. Aviso al cliente cuando el staff le deja una respuesta en el chat.
4. Aviso a la lista de "Notificaciones" cuando el cliente responde en el chat.
5. **Nuevo:** aviso al cliente cada vez que **cambia el estado** de su
   ticket (Nuevo → Asignado → En progreso → etc.) — antes esto no
   generaba ningún aviso. Si el estado se "cambia" al mismo valor que ya
   tenía, no se manda nada de más (probado).

### Quién recibe los avisos de "ticket nuevo" / "el cliente respondió"

Antes esto era una sola dirección fija en la variable de entorno
`ADMIN_NOTIFICATION_EMAIL` — para agregar o sacar gente había que editar
esa variable en Netlify y esperar un redeploy.

Ahora hay una pantalla **"Notificaciones"** en el panel de staff donde se
administra esa lista directamente (agregar/sacar emails), sin tocar
Netlify ni redeployar — el cambio es instantáneo. Mientras esa lista esté
vacía, sigue usando `ADMIN_NOTIFICATION_EMAIL` como respaldo (admite una
sola dirección o varias separadas por coma) — apenas agregues el primer
email desde la pantalla, esa lista pasa a mandar en su lugar. Probado con
2 destinatarios a la vez: llegó a los dos.

Usan [Resend](https://resend.com) — sin `RESEND_API_KEY` configurada, **no
fallan**: el email se loguea a consola en vez de mandarse, así podés seguir
probando el resto del flujo sin la credencial. Apenas la sumes a `.env`,
empiezan a mandarse de verdad, sin tocar código.

## Integración con Notion

Se conecta a la base **"User Stories"** que ya usa el equipo (no una base
nueva) — los tickets de soporte aparecen ahí con su propio tag, mezclados
con el resto del trabajo de producto.

Flujo confirmado:
- Ticket pasa a **"En progreso"** (desde el panel de staff) → se crea la
  page en "User Stories" (`lib/notion.js` → `crearTicketEnNotion`), con:
  - `Status producto` = **"Tickets Soporte"** (opción que Gonzalo agrega a
    mano en Notion — el código no crea opciones nuevas, solo las usa).
  - `Status Sprint Activo` = **"To do"**.
  - `Assignee` = la persona real de Notion que coincide por **nombre**
    con el/los agente(s) ya asignado(s) en Samply en ese momento (si hay
    coincidencia — si no encuentra a nadie con ese nombre exacto, queda
    sin asignar y lo loguea, no rompe).
  - El resto (cliente, categoría, módulo, prioridad, resumen IA, link al
    ticket) va como texto en el **cuerpo** de la page, no como properties
    nuevas — así no hace falta tocar el schema de la base existente.
- El botón **"Sincronizar con Notion"** hace las DOS direcciones cada vez
  que se aprieta:
  1. Empuja el Assignee actualizado hacia Notion (por si el agente
     asignado cambió en Samply después de crear la page).
  2. Trae de Notion las pages con `Status Sprint Activo` = **"Done"** y
     marca esos tickets como **"Resuelto"** en Samply — disparando el
     mismo email de resolución que ya existe para el cambio manual de
     estado (antes esto no mandaba email, ahora sí).

Los nombres de las properties (`Name`, `Status producto`,
`Status Sprint Activo`, `Assignee`) están como constantes al principio de
`lib/notion.js` — si tu base usa otros nombres, es lo único que hay que
ajustar ahí.

Sin `NOTION_API_KEY` / `NOTION_DATABASE_ID` configuradas, todo esto se
saltea con un log (no rompe el cambio de estado ni nada del resto de la
app — probado), y el botón de sync manual devuelve un error claro (400)
en vez de romper (probado, ya no da 500).

**Todavía no hay cron real** — la sync hay que dispararla a mano desde el
botón del panel, o llamando a `POST /api/admin/notion/sync`. El paso
siguiente natural es un Vercel Cron Job que la llame cada X minutos.

**No pude probar contra Notion de verdad en esta vuelta** (todavía no
tenemos `NOTION_API_KEY` — está en trámite con el admin del workspace).
Lo que sí probé: que el resto del sistema sigue funcionando sin romperse
mientras Notion no esté configurado. Apenas tengan la key + el
`NOTION_DATABASE_ID`, probamos el flujo real de punta a punta.

## Próximos pasos (todavía no construidos)

- **Cron real** para el auto-cierre de tickets y la sync de Notion (hoy
  ambos son "perezosos": se disparan al leer/pedir, no en background).
- **Upload de archivos real** (Vercel Blob o S3) para los adjuntos — hoy

  son solo links.
- **Análisis con Claude API**: al crear el ticket, llamar a la API para
  generar el `ai_resumen` que ya se muestra en el modal de detalle.

