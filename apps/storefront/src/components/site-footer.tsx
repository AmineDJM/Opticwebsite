import Link from "next/link";
import { Instagram, Facebook, Phone, Mail, MapPin } from "lucide-react";
import { Container } from "@optic/ui";
import { NewsletterForm } from "./newsletter-form.js";

/**
 * Footer (§45.16). Server component; social/contact come from site settings. Newsletter
 * is a small client island. Layout collapses to a single column on mobile.
 */
export function SiteFooter({
  brandName,
  tagline,
  contact,
  socials,
  labels,
  showNewsletter,
}: {
  brandName: string;
  tagline: string | null;
  contact: { phone?: string; email?: string; address?: string; city?: string };
  socials: { instagram?: string; facebook?: string };
  labels: {
    newsletter: string;
    newsletterText: string;
    subscribe: string;
    customerService: string;
    legal: string;
    followUs: string;
    allRightsReserved: string;
  };
  showNewsletter: boolean;
}) {
  const year = 2026;
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <Container>
        <div className="grid gap-10 py-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <h2 className="font-heading text-lg font-semibold text-foreground">{brandName}</h2>
            {tagline && <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>}
            <div className="mt-4 flex gap-3">
              {socials.instagram && (
                <a href={`https://instagram.com/${socials.instagram}`} aria-label="Instagram" className="text-muted-foreground hover:text-primary" target="_blank" rel="noreferrer">
                  <Instagram size={20} />
                </a>
              )}
              {socials.facebook && (
                <a href={`https://facebook.com/${socials.facebook}`} aria-label="Facebook" className="text-muted-foreground hover:text-primary" target="_blank" rel="noreferrer">
                  <Facebook size={20} />
                </a>
              )}
            </div>
          </div>

          <nav aria-label={labels.customerService}>
            <h3 className="text-sm font-semibold text-foreground">{labels.customerService}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/page/livraison" className="hover:text-primary">Livraison</Link></li>
              <li><Link href="/page/retours" className="hover:text-primary">Retours &amp; échanges</Link></li>
              <li><Link href="/page/contact" className="hover:text-primary">Contact</Link></li>
              <li><Link href="/suivi" className="hover:text-primary">Suivre ma commande</Link></li>
            </ul>
          </nav>

          <nav aria-label={labels.legal}>
            <h3 className="text-sm font-semibold text-foreground">{labels.legal}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/page/a-propos" className="hover:text-primary">À propos</Link></li>
              <li><Link href="/page/confidentialite" className="hover:text-primary">Confidentialité</Link></li>
              <li><Link href="/page/cgv" className="hover:text-primary">CGV</Link></li>
            </ul>
            <address className="mt-4 space-y-1.5 text-sm not-italic text-muted-foreground">
              {contact.phone && <div className="flex items-center gap-2"><Phone size={14} /> {contact.phone}</div>}
              {contact.email && <div className="flex items-center gap-2"><Mail size={14} /> {contact.email}</div>}
              {(contact.address || contact.city) && (
                <div className="flex items-center gap-2"><MapPin size={14} /> {[contact.address, contact.city].filter(Boolean).join(", ")}</div>
              )}
            </address>
          </nav>

          {showNewsletter && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">{labels.newsletter}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{labels.newsletterText}</p>
              <NewsletterForm subscribeLabel={labels.subscribe} className="mt-3" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} {brandName}. {labels.allRightsReserved}.</p>
          <p>Paiement à la livraison • Livraison 58 wilayas</p>
        </div>
      </Container>
    </footer>
  );
}
