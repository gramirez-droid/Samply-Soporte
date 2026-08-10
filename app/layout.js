import './globals.css';

export const metadata = {
  title: 'Samply · Soporte',
  description: 'Panel de soporte de Samply',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
