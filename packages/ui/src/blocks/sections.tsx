import { type ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Container } from "../primitives/misc.js";

/**
 * Presentational block sections for the page builder (§5). Each maps to a block type
 * in @optic/config's registry. They take resolved props + optional slots (the app
 * binds catalogue data and framework Link/Image), keeping @optic/ui DB-free.
 */

type BgToken = "surface" | "primary" | "accent" | "muted" | "background";
const bgClass: Record<BgToken, string> = {
  surface: "bg-surface text-surface-foreground",
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  muted: "bg-muted text-foreground",
  background: "bg-background text-foreground",
};

export function SectionHeading({
  title,
  subtitle,
  align = "left",
  action,
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  action?: ReactNode;
}) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", align === "center" && "flex-col items-center text-center")}>
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground md:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action && align === "left" && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export interface HeroProps {
  heading: string;
  subheading?: string;
  eyebrow?: string;
  imageUrl?: string;
  align?: "left" | "center";
  overlay?: number;
  height?: "md" | "lg" | "full";
  primaryCta?: ReactNode;
  secondaryCta?: ReactNode;
  ImageSlot?: ReactNode;
}

export function HeroBlock({
  heading,
  subheading,
  eyebrow,
  imageUrl,
  align = "left",
  overlay = 0.25,
  height = "lg",
  primaryCta,
  secondaryCta,
  ImageSlot,
}: HeroProps) {
  const heightClass = { md: "min-h-[380px]", lg: "min-h-[520px]", full: "min-h-[calc(100vh-4rem)]" }[height];
  return (
    <section className={cn("relative flex items-center overflow-hidden", heightClass)}>
      <div className="absolute inset-0 -z-10 bg-secondary">
        {ImageSlot}
        {!ImageSlot && imageUrl && (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black" style={{ opacity: overlay }} aria-hidden="true" />
      </div>
      <Container>
        <div className={cn("max-w-xl py-16 text-white", align === "center" && "mx-auto text-center")}>
          {eyebrow && <p className="mb-3 text-sm font-medium uppercase tracking-widest opacity-90">{eyebrow}</p>}
          <h1 className="font-heading text-4xl font-bold leading-tight md:text-5xl">{heading}</h1>
          {subheading && <p className="mt-4 text-lg opacity-90">{subheading}</p>}
          {(primaryCta || secondaryCta) && (
            <div className={cn("mt-8 flex flex-wrap gap-3", align === "center" && "justify-center")}>
              {primaryCta}
              {secondaryCta}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

export function CtaBlock({
  heading,
  text,
  imageUrl,
  cta,
  variant = "surface",
  ImageSlot,
}: {
  heading: string;
  text?: string;
  imageUrl?: string;
  cta?: ReactNode;
  variant?: BgToken;
  ImageSlot?: ReactNode;
}) {
  return (
    <section className={cn("overflow-hidden", bgClass[variant])}>
      <Container>
        <div className="grid items-center gap-8 py-12 md:grid-cols-2 md:py-16">
          <div>
            <h2 className="font-heading text-3xl font-semibold">{heading}</h2>
            {text && <p className="mt-3 max-w-md opacity-90">{text}</p>}
            {cta && <div className="mt-6">{cta}</div>}
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded">
            {ImageSlot ??
              (imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-black/10" />
              ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function AdvantagesBlock({
  heading,
  items,
}: {
  heading?: string;
  items: { icon?: ReactNode; title: string; text?: string }[];
}) {
  return (
    <Container>
      <div className="py-12">
        {heading && <SectionHeading title={heading} align="center" />}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 text-center">
              {item.icon && <div className="text-primary" aria-hidden="true">{item.icon}</div>}
              <h3 className="font-heading font-semibold text-foreground">{item.title}</h3>
              {item.text && <p className="text-sm text-muted-foreground">{item.text}</p>}
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}

export function TestimonialsBlock({
  heading,
  items,
}: {
  heading: string;
  items: { author: string; quote: string; rating?: number }[];
}) {
  return (
    <section className="bg-muted">
      <Container>
        <div className="py-12">
          <SectionHeading title={heading} align="center" />
          <div className="grid gap-6 md:grid-cols-3">
            {items.map((t, i) => (
              <figure key={i} className="flex flex-col gap-3 rounded bg-surface p-6">
                {t.rating != null && <Stars rating={t.rating} />}
                <blockquote className="text-sm text-foreground">“{t.quote}”</blockquote>
                <figcaption className="text-sm font-medium text-muted-foreground">— {t.author}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function FaqBlock({ heading, items }: { heading: string; items: { q: string; a: string }[] }) {
  return (
    <Container>
      <div className="mx-auto max-w-3xl py-12">
        <SectionHeading title={heading} align="center" />
        <div className="divide-y divide-border">
          {items.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-foreground">
                {item.q}
                <span className="ml-4 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Container>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <div className={cn("flex", className)} aria-label={`${rating} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < full ? "currentColor" : "none"} stroke="currentColor" className="text-warning" aria-hidden="true">
          <path strokeWidth="1.5" d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
        </svg>
      ))}
    </div>
  );
}
