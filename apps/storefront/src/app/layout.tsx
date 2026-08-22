import type { Metadata, Viewport } from "next";
import { getPreset, themeSchema } from "@optic/config";
import { ThemeStyle } from "@optic/ui";
import { createTranslator } from "@optic/i18n";
import { getTenant } from "../server/tenant.js";
import { getLocale } from "../server/tenant.js";
import { readCart } from "../server/cart.js";
import { listMenu } from "@optic/database";
import { direction } from "@optic/i18n";
import { SiteHeader, type HeaderNavItem } from "../components/site-header.js";
import { SiteFooter } from "../components/site-footer.js";
import { AnnouncementBar } from "../components/announcement-bar.js";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e5f68",
};

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  const seo = tenant.settings.seo as { defaultTitle?: string; defaultDescription?: string; titleTemplate?: string; indexable?: boolean };
  return {
    title: {
      default: seo.defaultTitle ?? tenant.name,
      template: seo.titleTemplate?.replace("{brand}", tenant.name) ?? `%s — ${tenant.name}`,
    },
    description: seo.defaultDescription ?? tenant.tagline ?? undefined,
    icons: tenant.theme?.faviconUrl ? { icon: tenant.theme.faviconUrl } : undefined,
    robots: seo.indexable === false ? { index: false, follow: false } : undefined,
    metadataBase: process.env.NEXT_PUBLIC_STOREFRONT_URL ? new URL(process.env.NEXT_PUBLIC_STOREFRONT_URL) : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [tenant, locale, cart] = await Promise.all([getTenant(), getLocale(), readCart()]);
  const t = createTranslator(locale);
  const dir = direction(locale);

  // Resolve the theme (fall back to a preset if a brand somehow lacks one).
  const themeParse = themeSchema.safeParse(
    tenant.theme
      ? { preset: tenant.theme.preset, colors: tenant.theme.colors, typography: tenant.theme.typography, layout: tenant.theme.layout, customTokens: tenant.theme.customTokens ?? undefined }
      : undefined,
  );
  const theme = themeParse.success ? themeParse.data : getPreset("clinical");

  const menu = await listMenu(tenant.db, "header");
  const nav: HeaderNavItem[] =
    (menu?.items as { label: string; url: string; isNew: boolean }[] | undefined)?.map((i) => ({ label: i.label, url: i.url, isNew: i.isNew })) ?? [];

  const contact = tenant.settings.contact as { phone?: string; email?: string; address?: string; city?: string };
  const socials = tenant.settings.socials as { instagram?: string; facebook?: string };
  const announcement = tenant.settings.announcement;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <ThemeStyle theme={theme} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          Aller au contenu
        </a>

        {tenant.features.announcementBar && announcement?.enabled && (
          <AnnouncementBar text={announcement.text} href={announcement.href} />
        )}

        <SiteHeader
          brandName={tenant.name}
          logoUrl={tenant.theme?.logoUrl ?? null}
          nav={nav}
          cartCount={cart?.itemCount ?? 0}
          labels={{
            search: t("common.search"),
            account: t("common.account"),
            cart: t("common.cart"),
            favorites: t("common.favorites"),
            menu: t("common.menu"),
            searchPlaceholder: t("common.searchPlaceholder"),
          }}
          features={{ search: tenant.features.search, favorites: tenant.features.favorites, accounts: tenant.features.accounts }}
        />

        <main id="main" className="flex-1">
          {children}
        </main>

        <SiteFooter
          brandName={tenant.name}
          tagline={tenant.tagline}
          contact={contact}
          socials={socials}
          showNewsletter={tenant.features.newsletter}
          labels={{
            newsletter: t("footer.newsletter"),
            newsletterText: t("footer.newsletterText"),
            subscribe: t("footer.subscribe"),
            customerService: t("footer.customerService"),
            legal: t("footer.legal"),
            followUs: t("footer.followUs"),
            allRightsReserved: t("footer.allRightsReserved"),
          }}
        />
      </body>
    </html>
  );
}
