"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Upload, Sparkles, Rocket } from "lucide-react";
import { Container, Card, Button, Input, Select, Checkbox, Alert, cn } from "@optic/ui";
import { getPreset, themeToCssVariables, type Theme } from "@optic/config";
import { buildPaletteAction } from "../server/actions/palette.js";
import { createWebsiteAction, type WizardState } from "../server/actions/website.js";

/**
 * Create-website wizard (§3, §C). Steps: Identity → Theme (palette from logo) →
 * Features → Preview → Generate. Simple, guided, no code. The palette is extracted from
 * the uploaded logo client-side (canvas) and corrected server-side for accessibility (§4).
 */
type Step = "identity" | "theme" | "features" | "preview";
const STEPS: { key: Step; label: string }[] = [
  { key: "identity", label: "Identité" },
  { key: "theme", label: "Thème" },
  { key: "features", label: "Modules" },
  { key: "preview", label: "Aperçu" },
];

export function CreateWizard({
  presets,
  featureLabels,
  defaultFeatures,
}: {
  presets: { value: string; label: string }[];
  featureLabels: Record<string, string>;
  defaultFeatures: Record<string, boolean>;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identity");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [identity, setIdentity] = useState({ name: "", slug: "", tagline: "", legalName: "", phone: "", email: "", city: "", instagram: "" });
  const [preset, setPreset] = useState("modern");
  const [paletteColors, setPaletteColors] = useState<string[]>([]);
  const [paletteMode, setPaletteMode] = useState<"light" | "dark">("light");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [theme, setTheme] = useState<Theme>(getPreset("modern"));
  const [features, setFeatures] = useState<Record<string, boolean>>({ ...defaultFeatures });
  const fileRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function applyPreset(key: string) {
    setPreset(key);
    if (paletteColors.length === 0) setTheme(getPreset(key));
    else buildPalette(paletteColors, key, paletteMode);
  }

  function buildPalette(colors: string[], presetKey: string, mode: "light" | "dark") {
    startTransition(async () => {
      const result = await buildPaletteAction(colors, mode);
      setTheme({ ...getPreset(presetKey), colors: result.ramp });
    });
  }

  async function onLogoChange(file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
    // Extract dominant colors client-side with a canvas.
    const colors = await extractColorsFromImage(url);
    setPaletteColors(colors);
    buildPalette(colors, preset, paletteMode);
  }

  function generate() {
    setError(null);
    startTransition(async () => {
      const result: WizardState = await createWebsiteAction({
        name: identity.name, slug: identity.slug, tagline: identity.tagline, legalName: identity.legalName,
        contact: { phone: identity.phone, email: identity.email, city: identity.city },
        socials: { instagram: identity.instagram },
        preset, paletteColors, paletteMode, logoUrl: "", // logo blob URL isn't persisted; owner re-uploads in admin
        features, includeDemoCategories: true, includeQuiz: features.lensQuiz !== false,
      });
      if (result.ok && result.slug) router.push(`/site/${result.slug}?created=1`);
      else setError(result.error ?? "Erreur");
    });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Container>
        <div className="py-8">
          <div className="mb-8">
            <button onClick={() => router.push("/")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Retour aux sites</button>
            <h1 className="font-heading text-2xl font-semibold">Créer un nouveau site</h1>
            {/* Stepper */}
            <ol className="mt-4 flex flex-wrap gap-2">
              {STEPS.map((s, i) => (
                <li key={s.key} className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-sm", i === stepIndex ? "bg-primary text-primary-foreground" : i < stepIndex ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                  {i < stepIndex ? <Check size={14} /> : <span className="font-bold">{i + 1}</span>} {s.label}
                </li>
              ))}
            </ol>
          </div>

          {error && <Alert variant="error" className="mb-4">{error}</Alert>}

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div>
              {step === "identity" && (
                <Card variant="bordered" padded className="space-y-4">
                  <h2 className="font-heading text-lg font-semibold">Identité de l&apos;enseigne</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Nom commercial" value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} required />
                    <Input label="Slug (URL)" value={identity.slug} onChange={(e) => setIdentity({ ...identity, slug: e.target.value })} hint="Vide = auto depuis le nom" />
                    <Input label="Raison sociale" value={identity.legalName} onChange={(e) => setIdentity({ ...identity, legalName: e.target.value })} />
                    <Input label="Slogan" value={identity.tagline} onChange={(e) => setIdentity({ ...identity, tagline: e.target.value })} />
                    <Input label="Téléphone" value={identity.phone} onChange={(e) => setIdentity({ ...identity, phone: e.target.value })} />
                    <Input label="E-mail" value={identity.email} onChange={(e) => setIdentity({ ...identity, email: e.target.value })} />
                    <Input label="Ville" value={identity.city} onChange={(e) => setIdentity({ ...identity, city: e.target.value })} />
                    <Input label="Instagram" value={identity.instagram} onChange={(e) => setIdentity({ ...identity, instagram: e.target.value })} />
                  </div>
                </Card>
              )}

              {step === "theme" && (
                <Card variant="bordered" padded className="space-y-4">
                  <h2 className="font-heading text-lg font-semibold">Charte graphique</h2>
                  <div>
                    <p className="mb-2 text-sm font-medium">Logo (pour extraire la palette)</p>
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded border-2 border-dashed border-border py-6 hover:border-primary/50">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo" className="h-12 w-auto" />
                      ) : (<><Upload size={20} className="text-muted-foreground" /> <span className="text-sm">Importer un logo</span></>)}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)} />
                  </div>

                  {paletteColors.length > 0 && (
                    <div>
                      <p className="mb-1 flex items-center gap-1 text-sm font-medium"><Sparkles size={14} className="text-accent" /> Couleurs détectées</p>
                      <div className="flex gap-2">
                        {paletteColors.map((c) => <span key={c} className="h-8 w-8 rounded border border-border" style={{ backgroundColor: c }} title={c} />)}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select label="Preset de style" value={preset} onChange={(e) => applyPreset(e.target.value)} options={presets} />
                    <Select label="Mode" value={paletteMode} onChange={(e) => { const m = e.target.value as "light" | "dark"; setPaletteMode(m); if (paletteColors.length) buildPalette(paletteColors, preset, m); else setTheme(getPreset(preset)); }} options={[{ value: "light", label: "Clair" }, { value: "dark", label: "Sombre" }]} />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Palette générée (accessibilité vérifiée)</p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                      {Object.entries(theme.colors).slice(0, 8).map(([name, hex]) => (
                        <div key={name} className="text-center">
                          <span className="block h-10 w-full rounded border border-border" style={{ backgroundColor: hex }} />
                          <span className="mt-1 block truncate text-[10px] text-muted-foreground">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {step === "features" && (
                <Card variant="bordered" padded>
                  <h2 className="mb-3 font-heading text-lg font-semibold">Modules à activer</h2>
                  <p className="mb-4 text-sm text-muted-foreground">Vous pourrez les modifier à tout moment dans l&apos;admin.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(featureLabels).map(([key, label]) => (
                      <Checkbox key={key} label={label} checked={features[key] ?? false} onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })} />
                    ))}
                  </div>
                </Card>
              )}

              {step === "preview" && (
                <Card variant="bordered" padded>
                  <h2 className="mb-3 font-heading text-lg font-semibold">Récapitulatif</h2>
                  <dl className="space-y-2 text-sm">
                    <Row label="Nom" value={identity.name || "—"} />
                    <Row label="Slogan" value={identity.tagline || "—"} />
                    <Row label="Style" value={presets.find((p) => p.value === preset)?.label ?? preset} />
                    <Row label="Modules actifs" value={String(Object.values(features).filter(Boolean).length)} />
                    <Row label="Catégories" value="Arborescence optique par défaut" />
                    <Row label="Quiz Verres" value={features.lensQuiz !== false ? "Inclus (20 questions)" : "Non inclus"} />
                  </dl>
                  <p className="mt-4 rounded bg-muted p-3 text-sm text-muted-foreground">
                    Le site sera créé avec le moteur partagé, votre branding et une isolation complète des données. Vous pourrez ensuite ajouter votre catalogue et exporter le code source.
                  </p>
                </Card>
              )}

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => (stepIndex === 0 ? router.push("/") : setStep(STEPS[stepIndex - 1]!.key))} disabled={pending}>
                  <ArrowLeft size={16} /> {stepIndex === 0 ? "Annuler" : "Précédent"}
                </Button>
                {step === "preview" ? (
                  <Button onClick={generate} loading={pending} disabled={!identity.name}><Rocket size={16} /> Générer le site</Button>
                ) : (
                  <Button onClick={() => setStep(STEPS[stepIndex + 1]!.key)} disabled={step === "identity" && !identity.name}>
                    Suivant <ArrowRight size={16} />
                  </Button>
                )}
              </div>
            </div>

            {/* Live preview panel */}
            <aside className="hidden lg:block">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Aperçu en direct</p>
              <div className="overflow-hidden rounded-lg border border-border shadow-sm">
                <MiniPreview theme={theme} name={identity.name || "Votre enseigne"} tagline={identity.tagline} />
              </div>
            </aside>
          </div>
        </div>
      </Container>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b border-border py-1.5"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}

/** A tiny live storefront preview rendered with the candidate theme's tokens. */
function MiniPreview({ theme, name, tagline }: { theme: Theme; name: string; tagline: string }) {
  // Custom-property maps are valid React style objects; they scope the tokens to this subtree.
  return (
    <div style={cssVarsToStyle(theme)} className="bg-background">
      <div>
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <span className="font-heading font-semibold text-primary">{name}</span>
          <span className="flex gap-2 text-xs text-muted-foreground"><span>Boutique</span><span>Panier</span></span>
        </div>
        <div className="bg-secondary px-4 py-10 text-secondary-foreground">
          <p className="text-xs opacity-80">{name}</p>
          <p className="mt-1 font-heading text-xl font-bold">{tagline || "Votre regard, sublimé"}</p>
          <span className="mt-3 inline-block rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Découvrir</span>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded bg-surface p-2">
              <div className="aspect-square rounded bg-muted" />
              <p className="mt-1 text-xs font-medium text-surface-foreground">Monture {i + 1}</p>
              <p className="text-xs font-semibold text-primary">8 900 DA</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function cssVarsToStyle(theme: Theme): React.CSSProperties {
  return themeToCssVariables(theme) as unknown as React.CSSProperties;
}

/** Extract up to 5 dominant colors from an image URL using a canvas. Client-only. */
async function extractColorsFromImage(url: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 48;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve([]);
      ctx.drawImage(img, 0, 0, size, size);
      let data: Uint8ClampedArray;
      try { data = ctx.getImageData(0, 0, size, size).data; } catch { return resolve([]); }
      const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!, a = data[i + 3]!;
        if (a < 200) continue;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2 / 255;
        if (l > 0.95 || l < 0.06) continue; // skip near-white/black
        const key = `${Math.round(r / 32)}-${Math.round(g / 32)}-${Math.round(b / 32)}`;
        const s = max === min ? 0 : (max - min) / 255;
        const weight = 1 + s;
        const ex = buckets.get(key);
        if (ex) { ex.count += weight; } else buckets.set(key, { r, g, b, count: weight });
      }
      const top = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 5);
      resolve(top.map((c) => `#${[c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`));
    };
    img.onerror = () => resolve([]);
    img.src = url;
  });
}
