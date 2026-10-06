import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing-page';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://agendalash.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AgendaLash — Sistema de gestión para estudios de pestañas en Venezuela',
    template: '%s | AgendaLash',
  },
  description:
    'Agenda de servicios, fichas de clientas, insumos con cobertura proyectada y facturación en dólares. Prueba AgendaLash gratis 7 días.',
  keywords: [
    'software para salones de belleza Venezuela',
    'sistema para estudio de pestañas',
    'agenda para lash artists',
    'control de insumos de pestañas',
    'lifting de pestañas',
    'gestión de salones de belleza',
    'facturación salón de belleza Venezuela',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_VE',
    url: '/',
    siteName: 'AgendaLash',
    title: 'AgendaLash — El sistema que ordena tu estudio de pestañas en un solo lugar',
    description:
      'Agenda, fichas de clientas, insumos con cobertura proyectada y facturación en dólares. Prueba gratis 7 días, sin tarjeta.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgendaLash — Sistema de gestión para estudios de pestañas',
    description:
      'Agenda, fichas, insumos y facturación para lash artists y salones de belleza. 7 días gratis.',
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AgendaLash',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Sistema de gestión en la nube para estudios de pestañas y salones de belleza de Venezuela.',
  offers: [
    { '@type': 'Offer', name: 'Lash Artist', price: '15', priceCurrency: 'USD' },
    { '@type': 'Offer', name: 'Estudio', price: '39', priceCurrency: 'USD' },
    { '@type': 'Offer', name: 'Red de estudios', price: '79', priceCurrency: 'USD' },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
