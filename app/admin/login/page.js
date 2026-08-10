import { Suspense } from 'react';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';

export const metadata = { title: 'Samply · Panel de staff' };

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
