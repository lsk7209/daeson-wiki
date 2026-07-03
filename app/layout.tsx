import type { Metadata, Viewport } from "next";
import Link from "next/link";
import PwaInstall from "@/app/pwa-install";
import "./globals.css";

export const metadata: Metadata = {
  title: "전경 개인 기록",
  description: "개인용 전경 구절 기록장",
  manifest: "/manifest.webmanifest",
  applicationName: "전경 기록",
  appleWebApp: {
    capable: true,
    title: "전경 기록",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": -1,
      "max-image-preview": "none",
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f3ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            전경 개인 기록
          </Link>
          <nav className="top-nav" aria-label="주요 메뉴">
            <Link href="/">전체 구절</Link>
            <Link href="/sources">연결 검수</Link>
            <Link href="/documents">문서 자료</Link>
            <PwaInstall />
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
