// Carga manuales de ejemplo en la tabla `manuales`.
// Uso: npm run db:seed:manuales
//
// Los archivos PDF reales van en public/manuales/*.pdf — este script
// solo inserta las filas de metadata apuntando a esos nombres de archivo.
// Para agregar un manual real: poné el PDF en public/manuales/ y sumá
// un objeto a MANUALES (o insertalo directo por SQL).
import pg from 'pg';

const MANUALES = [
  {
    titulo: 'Cómo levantar un pedido en la App móvil',
    descripcion: 'Guía paso a paso para preventistas: alta de pedido, aplicación de descuentos y cierre de visita.',
    modulo: 'App móvil (Preventa)',
    rol: 'Vendedor / Preventista',
    archivo_url: '/manuales/app-movil-alta-pedido.pdf',
  },
  {
    titulo: 'Registrar una entrega y cobro en la App móvil',
    descripcion: 'Cómo marcar una entrega física, registrar el cobro (efectivo/transferencia/tarjeta) y validar la transacción.',
    modulo: 'App móvil (Preventa)',
    rol: 'Entregador',
    archivo_url: '/manuales/app-movil-entrega-cobro.pdf',
  },
  {
    titulo: 'Cierre de caja y liquidación diaria',
    descripcion: 'Proceso completo de liquidación de un cobrador al final de la jornada, incluyendo diferencias de caja.',
    modulo: 'Facturación',
    rol: 'Cobrador',
    archivo_url: '/manuales/liquidacion-diaria.pdf',
  },
  {
    titulo: 'Configurar descuentos por volumen',
    descripcion: 'Cómo armar un descuento escalonado por volumen de compra mensual desde el panel de administración.',
    modulo: 'Facturación',
    rol: 'Administrador',
    archivo_url: '/manuales/configurar-descuentos-volumen.pdf',
  },
  {
    titulo: 'Primeros pasos en Televentas',
    descripcion: 'Guía general para operadores telefónicos: cómo cargar un pedido rápido desde TV.',
    modulo: 'Televentas',
    rol: 'Todos los perfiles',
    archivo_url: '/manuales/televentas-primeros-pasos.pdf',
  },
  {
    titulo: 'Cómo leer el panel de Reportería / KPIs',
    descripcion: 'Qué significa cada indicador del dashboard de KPIs y cómo interpretarlos para la gestión diaria.',
    modulo: 'Reportería / KPIs',
    rol: 'Administrador',
    archivo_url: '/manuales/kpis-guia-lectura.pdf',
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Falta DATABASE_URL. Copiá .env.example a .env y completá la connection string.');
    process.exit(1);
  }
  const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
  const client = new pg.Client({ connectionString, ssl });

  try {
    await client.connect();
    for (const m of MANUALES) {
      await client.query(
        `INSERT INTO manuales (titulo, descripcion, modulo, rol, archivo_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [m.titulo, m.descripcion, m.modulo, m.rol, m.archivo_url]
      );
    }
    console.log(`Listo — ${MANUALES.length} manuales de ejemplo cargados (o ya existían).`);
    console.log('Recordá poner los PDF reales en public/manuales/ con esos mismos nombres de archivo.');
  } catch (err) {
    console.error('Error en el seed de manuales:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
