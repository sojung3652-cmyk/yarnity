import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import "./patches.css";
import "./phone-web.css";
import { AppProvider } from "@/components/AppProvider";
import { Nav } from "@/components/Nav";
import { GlossaryFloat } from "@/components/glossary/GlossaryFloat";
import { AiHost } from "@/components/newbook/AiPanel";
import { AiBadge } from "@/components/AiBadge";
import { SparkleLogo } from "@/components/SparkleLogo";
import { BookProvider } from "@/components/Book/BookProvider";
import { Hero } from "@/components/home/Hero";
import { MobileChrome } from "@/components/mobile/MobileChrome";
import { ScrollTop } from "@/components/ScrollTop";
import { Floating } from "@/components/Floating";

// Home hero and the open book: the start button (Cormorant Garamond italic) and the "INTELLIGENT CROCHET"
// captions (Cormorant Garamond upright). Self-hosted by next/font (OFL), exposed as a CSS variable.
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });

export const metadata: Metadata = { title: "Yarnity" };
// maximumScale 1: iOS Safari zoomed the whole screen in when a field inside the phone's 3D book page was tapped
// (the page is CSS-zoomed and 3D-scaled, so its 16px inputs read as small). iOS still lets people pinch-zoom;
// desktop browsers ignore it.
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={cormorant.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=Pinyon+Script&family=Noto+Serif+KR:wght@300;400;500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" />
      </head>
      <body>
        <AppProvider>
          {/* the one book (and its stage) lives here, above the pages, so / <-> /new never re-creates it */}
          <BookProvider>
            <div className="wrap">
              <Hero />
              <Nav />
              {children}
              {/* the site's foot (Kim): the glinting wordmark, larger, INTELLIGENT CROCHET under it */}
              <footer><SparkleLogo className="foot-logo" /><p className="foot-cap" lang="en">Intelligent Crochet</p></footer>
            </div>
            {/* phones (767px and narrower): the bottom bar and the AI sheet */}
            <MobileChrome />
            {/* the glossary floating over 도안 보기 / 따라 뜨기 (their 용어집 button), phones and wide screens */}
            <GlossaryFloat />
            {/* the AI window (wide screens): here, not in the home hero, so it stays visible on every page once open */}
            <AiHost />
            {/* the one AI button, a round linen badge at the lower right (web and phones) */}
            <AiBadge />
            {/* 위로 가기: a small arrow at the lower left of whatever is scrolled (Kim) */}
            <ScrollTop />
            {/* 플로팅: pressable things float smoothly under the pointer, site-wide (Kim) */}
            <Floating />
          </BookProvider>
        </AppProvider>
      </body>
    </html>
  );
}
