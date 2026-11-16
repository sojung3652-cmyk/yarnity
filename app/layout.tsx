import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = { title: "Yarnity" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=Noto+Serif+KR:wght@300;400;500;700&family=Inter+Tight:wght@300;400&display=swap" />
      </head>
      <body>
        <AppProvider>
          <div className="wrap">
            <Nav />
            {children}
            <footer><span className="brand">Yarnity.</span></footer>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
