import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI請求書システム',
  description: 'AI搭載請求書作成・管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  )
}
