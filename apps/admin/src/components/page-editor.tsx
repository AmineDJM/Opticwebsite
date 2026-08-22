"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Trash2, Eye, EyeOff, Save } from "lucide-react";
import { BLOCK_LABELS, BLOCK_TYPES, parseBlockProps, type BlockType } from "@optic/config";
import { Card, Button, Input, Select, Textarea, Checkbox, Alert, cn } from "@optic/ui";
import { saveBlocksAction, savePageAction } from "../server/actions/content.js";

/**
 * Block-based page editor (§5): reorder / enable / add / remove blocks and edit their
 * key text/CTA/image fields. Deliberately not a Webflow — a robust, simple block list.
 * Props are validated server-side against the block registry on save.
 */
interface Block { id?: string; type: string; isEnabled: boolean; position: number; props: Record<string, unknown> }
interface Page { id: string; title: string; slug: string; kind: string; isPublished: boolean; body: string }

export function PageEditor({ page, blocks: initialBlocks }: { page: Page; blocks: Block[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [meta, setMeta] = useState(page);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const copy = [...blocks];
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    setBlocks(copy);
  }
  function updateBlock(i: number, patch: Partial<Block>) {
    setBlocks(blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function updateProps(i: number, patch: Record<string, unknown>) {
    setBlocks(blocks.map((b, idx) => (idx === i ? { ...b, props: { ...b.props, ...patch } } : b)));
  }
  function addBlock(type: string) {
    setBlocks([...blocks, { type, isEnabled: true, position: blocks.length, props: parseBlockProps(type, {}) }]);
  }
  function removeBlock(i: number) {
    setBlocks(blocks.filter((_, idx) => idx !== i));
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const metaResult = await savePageAction({ ...meta });
      if (!metaResult.ok) { setError(metaResult.error ?? "Erreur"); return; }
      const blocksResult = await saveBlocksAction(page.id, blocks.map((b, i) => ({ ...b, position: i })));
      if (!blocksResult.ok) { setError(blocksResult.error ?? "Erreur"); return; }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">Enregistré.</Alert>}

      <Card variant="bordered" padded className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Page</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Titre" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          <Input label="Slug" value={meta.slug} onChange={(e) => setMeta({ ...meta, slug: e.target.value })} disabled={meta.kind === "HOME"} />
        </div>
        <Checkbox label="Publiée" checked={meta.isPublished} onChange={(e) => setMeta({ ...meta, isPublished: e.target.checked })} />
        {meta.kind !== "HOME" && <Textarea label="Contenu (texte simple)" value={meta.body} onChange={(e) => setMeta({ ...meta, body: e.target.value })} rows={4} />}
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Blocs ({blocks.length})</h2>
        </div>
        <div className="space-y-3">
          {blocks.map((block, i) => (
            <Card key={block.id ?? `new-${i}`} variant="bordered" className={cn("overflow-hidden", !block.isEnabled && "opacity-60")}>
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
                <span className="font-medium">{BLOCK_LABELS[block.type as BlockType] ?? block.type}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => updateBlock(i, { isEnabled: !block.isEnabled })} aria-label={block.isEnabled ? "Désactiver" : "Activer"} className="rounded p-1.5 hover:bg-muted">{block.isEnabled ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" className="rounded p-1.5 hover:bg-muted disabled:opacity-30"><ChevronUp size={16} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Descendre" className="rounded p-1.5 hover:bg-muted disabled:opacity-30"><ChevronDown size={16} /></button>
                  <button type="button" onClick={() => removeBlock(i)} aria-label="Supprimer" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-error"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <BlockFields block={block} onChange={(patch) => updateProps(i, patch)} />
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium">
            <span className="mb-1 block">Ajouter un bloc</span>
            <select onChange={(e) => { if (e.target.value) { addBlock(e.target.value); e.target.value = ""; } }} className="rounded border border-border bg-surface px-3 py-2 text-sm" defaultValue="">
              <option value="" disabled>Choisir un type…</option>
              {BLOCK_TYPES.map((t) => <option key={t} value={t}>{BLOCK_LABELS[t]}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="sticky bottom-4 flex gap-3">
        <Button onClick={save} loading={pending}><Save size={18} /> Enregistrer la page</Button>
        <Button variant="outline" onClick={() => router.push("/contenu")}>Retour</Button>
      </div>
    </div>
  );
}

/** Common editable fields per block. Covers text/heading/cta/image for the key blocks. */
function BlockFields({ block, onChange }: { block: Block; onChange: (patch: Record<string, unknown>) => void }) {
  const p = block.props;
  const textField = (key: string, label: string) => (
    <Input label={label} value={(p[key] as string) ?? ""} onChange={(e) => onChange({ [key]: e.target.value })} />
  );
  const ctaField = (key: string) => {
    const cta = (p[key] as { label?: string; href?: string }) ?? {};
    return (
      <div className="grid grid-cols-2 gap-2">
        <Input label="CTA — texte" value={cta.label ?? ""} onChange={(e) => onChange({ [key]: { ...cta, label: e.target.value } })} />
        <Input label="CTA — lien" value={cta.href ?? ""} onChange={(e) => onChange({ [key]: { ...cta, href: e.target.value } })} />
      </div>
    );
  };
  const imageField = (key = "image") => {
    const img = (p[key] as { url?: string }) ?? {};
    return <Input label="Image (URL)" value={img.url ?? ""} onChange={(e) => onChange({ [key]: { url: e.target.value } })} hint="Utilisez la médiathèque pour obtenir une URL" />;
  };

  switch (block.type) {
    case "hero":
      return (<>{textField("eyebrow", "Sur-titre")}{textField("heading", "Titre")}{textField("subheading", "Sous-titre")}{imageField()}{ctaField("primaryCta")}{ctaField("secondaryCta")}</>);
    case "banner":
    case "visagismCta":
    case "virtualTryOnCta":
    case "quizCta":
    case "brandHighlight":
      return (<>{block.type === "brandHighlight" && textField("brandSlug", "Slug de la marque")}{textField("heading", "Titre")}{textField("text", "Texte")}{imageField()}{ctaField("cta")}</>);
    case "featuredProducts":
    case "newArrivals":
    case "bestSellers":
    case "promotions":
    case "featuredCategories":
    case "brands":
    case "testimonials":
    case "faq":
    case "newsletter":
      return (<>{textField("heading", "Titre")}{(block.type === "featuredProducts") && <Select label="Source" value={(p.source as string) ?? "featured"} onChange={(e) => onChange({ source: e.target.value })} options={[{ value: "featured", label: "Vedettes" }, { value: "bestsellers", label: "Best-sellers" }, { value: "new", label: "Nouveautés" }]} />}</>);
    case "richText":
      return (<>{textField("heading", "Titre")}<Textarea label="HTML" value={(p.html as string) ?? ""} onChange={(e) => onChange({ html: e.target.value })} rows={4} /></>);
    default:
      return <p className="text-sm text-muted-foreground">Ce bloc utilise ses réglages par défaut.</p>;
  }
}
