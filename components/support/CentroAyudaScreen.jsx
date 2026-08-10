'use client';
import React from 'react';
import { SectionBanner } from '@/components/ds/SectionBanner';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ds/Input';
import { Select } from '@/components/ds/Select';
import { Badge } from '@/components/ds/Badge';
import { Icon } from '@/components/ds/Icon';

const MODULOS = ['App móvil (Preventa)', 'Televentas', 'B2B eCommerce', 'Inventarios', 'Facturación', 'Reportería / KPIs'];
const ROLES = ['Todos los perfiles', 'Administrador', 'Vendedor / Preventista', 'Cobrador', 'Entregador'];

export function CentroAyudaScreen() {
  const [manuales, setManuales] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [filtroModulo, setFiltroModulo] = React.useState('');
  const [filtroRol, setFiltroRol] = React.useState('');
  const [search, setSearch] = React.useState('');

  const loadManuales = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroModulo) params.set('modulo', filtroModulo);
      if (filtroRol) params.set('rol', filtroRol);
      const res = await fetch(`/api/manuales?${params.toString()}`);
      if (!res.ok) throw new Error('No se pudieron cargar los manuales');
      const data = await res.json();
      setManuales(data.manuales);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filtroModulo, filtroRol]);

  React.useEffect(() => {
    loadManuales();
  }, [loadManuales]);

  // Agrupamos por módulo para que se lea como un índice de manual, no como
  // una tabla plana — se entiende mejor navegando por área del producto.
  // El buscador de texto libre filtra en el cliente sobre lo ya traído del
  // server (que a su vez ya viene filtrado por módulo/rol).
  const grupos = React.useMemo(() => {
    const filtrados = search.trim()
      ? manuales.filter((m) => {
          const q = search.trim().toLowerCase();
          return m.titulo.toLowerCase().includes(q) || (m.descripcion || '').toLowerCase().includes(q);
        })
      : manuales;
    const byModulo = new Map();
    for (const m of filtrados) {
      if (!byModulo.has(m.modulo)) byModulo.set(m.modulo, []);
      byModulo.get(m.modulo).push(m);
    }
    return Array.from(byModulo.entries());
  }, [manuales, search]);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card pad="none">
        <SectionBanner icon="download">Centro de ayuda</SectionBanner>

        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Input icon="search" placeholder="Buscar por título o descripción" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select placeholder="Módulo" options={MODULOS} value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)} />
          <Select placeholder="Perfil" options={ROLES} value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} />
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          {error ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--samply-red)' }}>
              {error} — <button onClick={loadManuales} style={{ color: 'var(--samply-blue)', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>reintentar</button>
            </div>
          ) : loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando manuales...</div>
          ) : grupos.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
              No hay manuales para ese filtro todavía.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {grupos.map(([modulo, items]) => (
                <div key={modulo}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 'var(--ls-label)', marginBottom: 10 }}>
                    {modulo}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {items.map((m) => (
                      <Card key={m.id} pad="md" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--color-ai-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                            <Icon name="download" size={18} color="var(--color-ai)" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 'var(--lh-snug)' }}>{m.titulo}</div>
                            <div style={{ marginTop: 4 }}>
                              <Badge tone="neutral" size="sm">{m.rol}</Badge>
                            </div>
                          </div>
                        </div>
                        {m.descripcion && (
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 'var(--lh-normal)' }}>
                            {m.descripcion}
                          </div>
                        )}
                        <a href={m.archivo_url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto' }}>
                          <Button variant="secondary" size="sm" icon="download" fullWidth>
                            Ver PDF
                          </Button>
                        </a>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
