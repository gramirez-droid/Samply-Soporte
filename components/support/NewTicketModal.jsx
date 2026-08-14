'use client';
import React from 'react';
import { Modal } from '@/components/ds/Modal';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ds/Input';
import { Select } from '@/components/ds/Select';
import { AiInsight } from '@/components/ds/AiInsight';
import { CATEGORIAS, MODULOS, PRIORIDADES } from './constants';

const EMPTY_FORM = { categoria: '', modulo: '', asunto: '', desc: '', prioridad: 'Media' };

export function NewTicketModal({ open, onClose, onCreate, submitting, error }) {
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [adjunto, setAdjunto] = React.useState(null); // { nombre, url }
  const [subiendo, setSubiendo] = React.useState(false);
  const [errorAdjunto, setErrorAdjunto] = React.useState(null);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setAdjunto(null);
      setErrorAdjunto(null);
    }
  }, [open]);

  function set(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setErrorAdjunto(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir el archivo');
      setAdjunto({ nombre: data.nombre, url: data.url });
    } catch (err) {
      setErrorAdjunto(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function submit() {
    if (!form.asunto.trim()) return;
    const ok = await onCreate({
      asunto: form.asunto,
      categoria: form.categoria || CATEGORIAS[0],
      modulo: form.modulo || MODULOS[0],
      prioridad: form.prioridad,
      descripcion: form.desc,
      adjunto,
    });
    if (ok) {
      setForm(EMPTY_FORM);
      setAdjunto(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={560}
      title="Crear nuevo ticket"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="plus" onClick={submit} disabled={submitting || subiendo || !form.asunto.trim()}>
            {submitting ? 'Creando...' : 'Crear ticket'}
          </Button>
        </>
      }
    >
      {error && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--samply-red-50)', color: 'var(--samply-red)', fontSize: 13 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Select label="Categoría" placeholder="Seleccionar" options={CATEGORIAS} value={form.categoria} onChange={set('categoria')} />
        <Select label="Módulo afectado" placeholder="Seleccionar" options={MODULOS} value={form.modulo} onChange={set('modulo')} />
      </div>
      <Input
        label="Asunto"
        placeholder="Ej: el listado de precios no actualiza"
        value={form.asunto}
        onChange={set('asunto')}
        style={{ marginBottom: 12 }}
        required
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Descripción detallada</label>
        <textarea
          rows={3}
          value={form.desc}
          onChange={set('desc')}
          placeholder="Contanos qué pasó, cuándo empezó y los pasos para reproducirlo"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid transparent',
            background: '#F1F5FB',
            resize: 'vertical',
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <Select label="Prioridad" options={PRIORIDADES} value={form.prioridad} onChange={set('prioridad')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Adjuntar captura</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png"
            onChange={handleFile}
            disabled={subiendo}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 13, height: 40 }}
          />
          {subiendo && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Subiendo...</span>}
          {adjunto && !subiendo && <span style={{ fontSize: 12, color: 'var(--samply-green, #27AE60)' }}>✓ {adjunto.nombre}</span>}
          {errorAdjunto && <span style={{ fontSize: 12, color: 'var(--samply-red)' }}>{errorAdjunto}</span>}
        </div>
      </div>
      <AiInsight icon="sparkles" title="Qué pasa después">
        Al crear el ticket queda guardado y disponible en tu panel. El análisis automático con IA y la sincronización con Notion se activan en las próximas fases.
      </AiInsight>
    </Modal>
  );
}
