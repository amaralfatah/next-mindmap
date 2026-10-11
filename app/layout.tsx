import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ThemeScript } from "@/components/theme";
import { AppToaster } from "@/components/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fontVariables } from "@/lib/fonts";
import { t } from "@/lib/i18n";
import "./globals.css";

// Absolute URLs for the link-preview image. Set NEXT_PUBLIC_SITE_URL once the domain is final.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mindmap.sararia.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${t.app.name} · Sararia`, template: `%s · ${t.app.name}` },
  description: t.app.description,
  applicationName: t.app.name,
  formatDetection: { telephone: false },
  openGraph: { type: "website", siteName: t.app.name, title: `${t.app.name} · Sararia`, description: t.app.description },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#241222" },
  ],
  viewportFit: "cover",
  // Android: the keyboard shrinks the layout, so the editor's toolbar stays above it.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        <TooltipProvider delay={400}>{children}</TooltipProvider>
        <AppToaster />
        <Analytics />
      </body>
    </html>
  );
}
