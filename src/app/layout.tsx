import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dead Internet Theory - 댓글 관리 시스템',
  description: 'AI 페르소나 봇이 자동으로 댓글을 생성하는 독립적인 댓글 관리 시스템',
  keywords: ['댓글 시스템', 'AI 봇', '블로그', '자동화', 'Dead Internet Theory'],
  authors: [{ name: 'Dead Internet Theory Team' }],
  creator: 'Dead Internet Theory',
  publisher: 'Dead Internet Theory',
  robots: 'noindex, nofollow', // 관리자 시스템이므로 검색엔진에서 제외
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1f2937', // 다크 그레이 테마
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <link rel="icon" type="image/png" href="/m_favicon.png" />
      <body className={inter.className}>{children}</body>
    </html>
  )
}
