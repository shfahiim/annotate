import type { Metadata } from 'next'
import { Geist_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'

const mono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

const sans = Space_Grotesk({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Annotate',
  description: 'Fast keyboard-driven image annotation tool',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
