import { requirePermission } from "../../../server/session.js";
import { SettingsForm } from "../../../components/settings-form.js";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requirePermission("settings:read");
  const [website, settings, flags] = await Promise.all([
    ctx.db.website.findFirst({ where: { id: ctx.websiteId } as never, select: { name: true, tagline: true } }),
    ctx.db.siteSettings.findFirst({ where: { websiteId: ctx.websiteId } as never }),
    ctx.db.featureFlag.findMany({ where: {} as never }),
  ]);
  const w = website as { name: string; tagline: string | null };
  const s = settings as never as { contact: Record<string, string>; socials: Record<string, string>; commerce: Record<string, unknown>; seo: Record<string, unknown>; announcement: { text: string; href?: string; enabled: boolean } | null } | null;
  const features: Record<string, boolean> = {};
  for (const f of flags as { key: string; enabled: boolean }[]) features[f.key] = f.enabled;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold">Paramètres</h1>
      <SettingsForm
        currency={ctx.currency}
        features={features}
        initial={{
          name: w.name,
          tagline: w.tagline ?? "",
          contact: (s?.contact as never) ?? {},
          socials: (s?.socials as never) ?? {},
          commerce: (s?.commerce as never) ?? {},
          seo: (s?.seo as never) ?? {},
          announcement: s?.announcement ?? null,
        }}
      />
    </div>
  );
}
