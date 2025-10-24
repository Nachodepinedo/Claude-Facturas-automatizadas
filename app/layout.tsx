import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Buscador de Facturas',
  description: 'Sistema de búsqueda de facturas corporativas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
