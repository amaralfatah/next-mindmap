import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ThemeScript, ThemeWatcher } from "@/components/theme";
import { AppToaster } from "@/components/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fontVariables } from "@/lib/fonts";
import { I18nProvider } from "@/components/i18n-provider";
import { dictionaries } from "@/lib/i18n";
import { requestLocale } from "@/lib/locale-server";
import "./globals.css";

// Absolute URLs for the link-preview image. Set NEXT_PUBLIC_SITE_URL once the domain is final.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mindmap.sararia.com";

export async function generateMetadata(): Promise<Metadata> {
  const t = dictionaries[await requestLocale()];
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t.app.name, template: `%s · ${t.app.name}` },
    description: t.app.description,
    applicationName: t.app.name,
    formatDetection: { telephone: false },
    openGraph: { type: "website", siteName: t.app.name, title: t.app.name, description: t.app.description },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#191918" },
  ],
  viewportFit: "cover",
  // Android: the keyboard shrinks the layout, so the editor's toolbar stays above it.
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await requestLocale();
  return (
    <html lang={locale} className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        <I18nProvider locale={locale}>
          <TooltipProvider delay={400}>{children}</TooltipProvider>
          <AppToaster />
          <ThemeWatcher />
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
