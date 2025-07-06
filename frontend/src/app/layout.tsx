import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CollabSpace - Real-time Collaboration Platform',
  description: 'Professional real-time collaboration platform for developers and teams',
  keywords: ['collaboration', 'real-time', 'coding', 'development', 'team'],
  authors: [{ name: 'Ayman Singh' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'CollabSpace - Real-time Collaboration Platform',
    description: 'Professional real-time collaboration platform for developers and teams',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CollabSpace - Real-time Collaboration Platform',
    description: 'Professional real-time collaboration platform for developers and teams',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
} 