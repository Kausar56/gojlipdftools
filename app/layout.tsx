import type { Metadata } from "next";
import { Geist_Mono, Inter, Noto_Sans_Bengali, Space_Grotesk } from "next/font/google";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const siteUrl = "https://www.gojli.com";
const siteName = "Gojli";
const siteDescription =
  "Free, browser-based PDF tools to merge, split, compress, and convert PDF files online. No installation required.";

export const metadata: Metadata = {
  // Lets Next.js resolve relative asset paths (like the auto-generated
  // opengraph-image below) into the absolute URLs social platforms require —
  // without this, Next.js can't build correct og:image/twitter:image tags.
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gojli — Merge, Split, Compress & Convert PDFs Online",
    template: "%s | Gojli",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName,
    title: "Gojli — Merge, Split, Compress & Convert PDFs Online",
    description: siteDescription,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Gojli — Merge, Split, Compress & Convert PDFs Online",
    description: siteDescription,
  },
};

// Defaults to light regardless of system preference — dark only applies once
// the user explicitly picks it via ThemeToggle (saved to localStorage).
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${notoSansBengali.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
