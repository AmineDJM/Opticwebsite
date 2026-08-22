"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { FEATURE_LABELS, type FeatureKey } from "@optic/config";
import { parseMoneyToCents } from "@optic/core";
import { Card, Button, Input, Textarea, Select, Checkbox, Alert } from "@optic/ui";
import { saveSettingsAction, toggleFeatureAction } from "../server/actions/settings.js";

/** Site settings + feature toggles (§25, §4). */
export function SettingsForm({
  currency,
  initial,
  features,
}: {
  currency: string;
  initial: {
    name: string; tagline: string;
    contact: { phone?: string; whatsapp?: string; email?: string; address?: string; city?: string };
    socials: { instagram?: string; facebook?: string; tiktok?: string };
    commerce: { requireEmailAtCheckout?: boolean; requireAccountToOrder?: boolean; stockStrategy?: string; freeShippingThresholdCents?: number | null; returnPolicyDays?: number };
    seo: { defaultTitle?: string; defaultDescription?: string; indexable?: boolean };
    announcement: { text: string; href?: string; enabled: boolean } | null;
  };
  features: Record<string, boolean>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(initial);
  const [freeShipInput, setFreeShipInput] = useState(initial.commerce.freeShippingThresholdCents ? String(initial.commerce.freeShippingThresholdCents / 100) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    setError(null); setSaved(false);
    startTransition(async () => {
      const result = await saveSettingsAction({
        name: form.name,
        tagline: form.tagline,
        contact: form.contact,
        socials: form.socials,
        commerce: {
          requireEmailAtCheckout: !!form.commerce.requireEmailAtCheckout,
          requireAccountToOrder: !!form.commerce.requireAccountToOrder,
          stockStrategy: (form.commerce.stockStrategy as "reserve" | "decrement") ?? "reserve",
          freeShippingThresholdCents: freeShipInput ? parseMoneyToCents(freeShipInput, currency) : null,
          returnPolicyDays: form.commerce.returnPolicyDays ?? 14,
        },
        seo: { defaultTitle: form.seo.defaultTitle, defaultDescription: form.seo.defaultDescription, indexable: form.seo.indexable ?? true },
        announcement: form.announcement,
      });
      if (result.ok) { setSaved(true); router.refresh(); } else setError(result.error ?? "Erreur");
    });
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">Paramètres enregistrés.</Alert>}

      <Card variant="bordered" padded className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Identité</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nom commercial" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Slogan" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </div>
      </Card>

      <Card variant="bordered" padded className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Coordonnées &amp; réseaux</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Téléphone" value={form.contact.phone ?? ""} onChange={(e) => setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })} />
          <Input label="WhatsApp" value={form.contact.whatsapp ?? ""} onChange={(e) => setForm({ ...form, contact: { ...form.contact, whatsapp: e.target.value } })} />
          <Input label="E-mail" value={form.contact.email ?? ""} onChange={(e) => setForm({ ...form, contact: { ...form.contact, email: e.target.value } })} />
          <Input label="Ville" value={form.contact.city ?? ""} onChange={(e) => setForm({ ...form, contact: { ...form.contact, city: e.target.value } })} />
          <Input label="Adresse" value={form.contact.address ?? ""} onChange={(e) => setForm({ ...form, contact: { ...form.contact, address: e.target.value } })} />
          <Input label="Instagram" value={form.socials.instagram ?? ""} onChange={(e) => setForm({ ...form, socials: { ...form.socials, instagram: e.target.value } })} />
          <Input label="Facebook" value={form.socials.facebook ?? ""} onChange={(e) => setForm({ ...form, socials: { ...form.socials, facebook: e.target.value } })} />
        </div>
      </Card>

      <Card variant="bordered" padded className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Commerce</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Stratégie de stock" value={form.commerce.stockStrategy ?? "reserve"} onChange={(e) => setForm({ ...form, commerce: { ...form.commerce, stockStrategy: e.target.value } })} options={[{ value: "reserve", label: "Réserver à la commande" }, { value: "decrement", label: "Décrémenter immédiatement" }]} />
          <Input label={`Livraison offerte dès (${currency})`} value={freeShipInput} onChange={(e) => setFreeShipInput(e.target.value)} inputMode="decimal" hint="Vide = désactivé" />
          <Input label="Politique de retour (jours)" type="number" value={String(form.commerce.returnPolicyDays ?? 14)} onChange={(e) => setForm({ ...form, commerce: { ...form.commerce, returnPolicyDays: Number(e.target.value) } })} />
        </div>
        <div className="flex flex-wrap gap-4">
          <Checkbox label="E-mail obligatoire au checkout" checked={!!form.commerce.requireEmailAtCheckout} onChange={(e) => setForm({ ...form, commerce: { ...form.commerce, requireEmailAtCheckout: e.target.checked } })} />
          <Checkbox label="Compte obligatoire pour commander" checked={!!form.commerce.requireAccountToOrder} onChange={(e) => setForm({ ...form, commerce: { ...form.commerce, requireAccountToOrder: e.target.checked } })} />
        </div>
      </Card>

      <Card variant="bordered" padded className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Barre d&apos;annonce</h2>
        <Checkbox label="Activer" checked={!!form.announcement?.enabled} onChange={(e) => setForm({ ...form, announcement: { text: form.announcement?.text ?? "", href: form.announcement?.href, enabled: e.target.checked } })} />
        <Input label="Texte" value={form.announcement?.text ?? ""} onChange={(e) => setForm({ ...form, announcement: { text: e.target.value, href: form.announcement?.href, enabled: form.announcement?.enabled ?? true } })} />
      </Card>

      <Card variant="bordered" padded className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">SEO</h2>
        <Input label="Titre par défaut" value={form.seo.defaultTitle ?? ""} onChange={(e) => setForm({ ...form, seo: { ...form.seo, defaultTitle: e.target.value } })} />
        <Textarea label="Description par défaut" value={form.seo.defaultDescription ?? ""} onChange={(e) => setForm({ ...form, seo: { ...form.seo, defaultDescription: e.target.value } })} rows={2} />
        <Checkbox label="Site indexable par les moteurs" checked={form.seo.indexable ?? true} onChange={(e) => setForm({ ...form, seo: { ...form.seo, indexable: e.target.checked } })} />
      </Card>

      <div className="sticky bottom-4"><Button onClick={save} loading={pending}><Save size={18} /> Enregistrer</Button></div>

      <Card variant="bordered" padded>
        <h2 className="mb-3 font-heading text-lg font-semibold">Fonctionnalités</h2>
        <p className="mb-4 text-sm text-muted-foreground">Activez ou désactivez des modules. Les changements sont immédiats.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((key) => (
            <FeatureToggle key={key} featureKey={key} label={FEATURE_LABELS[key]} enabled={features[key] ?? false} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function FeatureToggle({ featureKey, label, enabled }: { featureKey: string; label: string; enabled: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex cursor-pointer items-center justify-between rounded border border-border p-3">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        onChange={(e) => { const v = e.target.checked; setOn(v); startTransition(async () => { await toggleFeatureAction(featureKey, v); router.refresh(); }); }}
        className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-muted transition checked:bg-primary relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition checked:before:translate-x-4"
      />
    </label>
  );
}
