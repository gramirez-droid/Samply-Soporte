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
- Tiene una sección **"Clientes"** (nav del sidebar) para dar de alta
  distribuidoras nuevas: nombre, email, contraseña inicial. Valida email,
  contraseña mínima (6 caracteres) y que no exista ya ese email. El cliente
  creado ahí puede loguearse de inmediato en `/login` con la contraseña que
  le pusiste — no hace falta ningún paso más.
- Tiene una sección **"Centro de ayuda"** para cargar manuales sin tocar
  SQL: título, descripción, módulo, perfil, y el link del PDF. Lo que se
  crea ahí aparece de inmediato en el Centro de Ayuda del panel de cliente
  (probado: creás un manual como staff, y ya está visible del otro lado sin
  ningún paso más). Sigue siendo por URL, no upload real, mismo motivo que
  los adjuntos de tickets.

## Emails

Dos emails automáticos al crear un ticket (`POST /api/tickets`):
1. Aviso a `ADMIN_NOTIFICATION_EMAIL` (el mail interno que definan en Samply).
2. Confirmación al cliente que lo creó, con el número de ticket.

Usan [Resend](https://resend.com) — sin `RESEND_API_KEY` configurada, **no
fallan**: el email se loguea a consola en vez de mandarse, así podés seguir
probando el resto del flujo sin la credencial. Apenas la sumes a `.env`,
empiezan a mandarse de verdad, sin tocar código.

## Integración con Notion

Flujo confirmado:
- Ticket pasa a **"En progreso"** (desde el panel de staff) → se crea la
  page en la Notion database de soporte (`lib/notion.js` →
  `crearTicketEnNotion`), guardando el `notion_page_id`.
- Cuando en Notion el staff marca **"Validación Customer"** → el ticket
  pasa a **"Resuelto"** acá (`lib/tickets.js` →
  `sincronizarResueltosDesdeNotion`).

Sin `NOTION_API_KEY` / `NOTION_DATABASE_ID` configuradas, la creación de la
page se saltea con un log (no rompe el cambio de estado), y el botón de
sync manual devuelve un error claro en vez de romper. Los nombres de las
properties de Notion (`Asunto`, `Categoría`, `Prioridad`, `Estado`,
`Cliente`, `Resumen IA`, `Link al ticket`) tienen que coincidir exacto con
los de tu database — es lo único que hay que ajustar si los tuyos son
distintos.

**Todavía no hay cron real** — la sync reversa hay que dispararla a mano
desde el botón del panel, o llamando a `POST /api/admin/notion/sync`. El
paso siguiente natural es un Vercel Cron Job que la llame cada X minutos.

## Próximos pasos (todavía no construidos)

- **Cron real** para el auto-cierre de tickets y la sync de Notion (hoy
  ambos son "perezosos": se disparan al leer/pedir, no en background).
- **Upload de archivos real** (Vercel Blob o S3) para los adjuntos — hoy
  son solo links.
- **Análisis con Claude API**: al crear el ticket, llamar a la API para
  generar el `ai_resumen` que ya se muestra en el modal de detalle.

