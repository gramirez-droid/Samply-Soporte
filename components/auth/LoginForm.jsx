'use client';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ds/Card';
import { Input } from '@/components/ds/Input';
import { Button } from '@/components/ds/Button';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
      const next = searchParams.get('next') || '/soporte';
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: 24,
      }}
    >
      <Card style={{ width: 380, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img src="/logos/samply-logo-color.png" alt="Samply" style={{ height: 32 }} />
        </div>
        <h1 style={{ fontSize: 'var(--fs-h2)', color: 'var(--text-primary)', textAlign: 'center', margin: '0 0 6px' }}>
          Panel de soporte
        </h1>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', textAlign: 'center', margin: '0 0 24px' }}>
          Ingresá con las credenciales de tu cuenta
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Email"
            type="email"
            placeholder="nombre@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--samply-red-50)', color: 'var(--samply-red)', fontSize: 13 }}>
              {error}
            </div>
          )}
          <Button type="submit" variant="primary" fullWidth disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
