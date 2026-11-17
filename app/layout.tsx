import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { Nav } from "@/components/Nav";
import { FoilLogo } from "@/components/FoilLogo";
import { BookProvider } from "@/components/Book/BookProvider";
import { Hero } from "@/components/home/Hero";

// Home hero and the open book: the start button (Cormorant Garamond italic) and the "INTELLIGENT CROCHET"
// captions (Cormorant Garamond upright). Self-hosted by next/font (OFL), exposed as a CSS variable.
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: "500", style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });

export const metadata: Metadata = { title: "Yarnity" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={cormorant.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=Noto+Serif+KR:wght@300;400;500;700&display=swap" />
      </head>
      <body>
        <AppProvider>
          {/* the one book (and its stage) lives here, above the pages, so / <-> /new never re-creates it */}
          <BookProvider>
            <div className="wrap">
              <Hero />
              <Nav />
              {children}
              <footer><FoilLogo className="foot-foil" /></footer>
            </div>
          </BookProvider>
        </AppProvider>
      </body>
    </html>
  );
}
