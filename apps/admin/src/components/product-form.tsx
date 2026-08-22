"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";
import { FRAME_SHAPES, FRAME_MATERIALS, FRAME_TYPES, FACE_SHAPES, parseMoneyToCents } from "@optic/core";
import { Button, Input, Select, Textarea, Card, Checkbox, Alert } from "@optic/ui";
import { saveProductAction, deleteProductAction, duplicateProductAction } from "../server/actions/products.js";

/**
 * Product editor (§26): general info, pricing, frame attributes, visagism tags,
 * categories, and inline variant management. Prices are entered in major units and
 * converted to cents. On save, redirects to the list.
 */
interface VariantRow { id?: string; sku: string; name: string; colorName: string; colorHex: string; size: string; priceCents: number | null; stock: number }
interface ProductVM {
  id?: string; name: string; sku: string; slug: string; brandId: string; shortDescription: string; description: string;
  status: string; gender: string; ageGroup: string; priceCents: number; comparePriceCents: number | null;
  frameShape: string; frameMaterial: string; frameType: string; isNew: boolean; isBestseller: boolean; isFeatured: boolean;
  recommendedFaceShapes: string[]; categoryIds: string[]; variants: VariantRow[];
}

export function ProductForm({
  currency,
  brands,
  categories,
  product,
}: {
  currency: string;
  brands: { id: string; name: string }[];
  categories: { id: string; name: string; parentId: string | null }[];
  product?: ProductVM;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductVM>(
    product ?? {
      name: "", sku: "", slug: "", brandId: "", shortDescription: "", description: "",
      status: "DRAFT", gender: "UNISEX", ageGroup: "ADULT", priceCents: 0, comparePriceCents: null,
      frameShape: "", frameMaterial: "", frameType: "", isNew: false, isBestseller: false, isFeatured: false,
      recommendedFaceShapes: [], categoryIds: [], variants: [],
    },
  );
  const [priceInput, setPriceInput] = useState(product ? String(product.priceCents / 100) : "");
  const [compareInput, setCompareInput] = useState(product?.comparePriceCents ? String(product.comparePriceCents / 100) : "");

  function set<K extends keyof ProductVM>(key: K, value: ProductVM[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addVariant() {
    set("variants", [...form.variants, { sku: `${form.sku || "SKU"}-${form.variants.length + 1}`, name: "", colorName: "", colorHex: "#000000", size: "", priceCents: null, stock: 0 }]);
  }
  function updateVariant(i: number, patch: Partial<VariantRow>) {
    set("variants", form.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function removeVariant(i: number) {
    set("variants", form.variants.filter((_, idx) => idx !== i));
  }

  function save() {
    setError(null);
    const priceCents = parseMoneyToCents(priceInput, currency) ?? 0;
    const comparePriceCents = compareInput ? parseMoneyToCents(compareInput, currency) : null;
    startTransition(async () => {
      const result = await saveProductAction({ ...form, priceCents, comparePriceCents });
      if (result.ok) router.push("/produits");
      else setError(result.error ?? "Erreur");
    });
  }

  const toggleCategory = (id: string) => set("categoryIds", form.categoryIds.includes(id) ? form.categoryIds.filter((c) => c !== id) : [...form.categoryIds, id]);
  const toggleFace = (s: string) => set("recommendedFaceShapes", form.recommendedFaceShapes.includes(s) ? form.recommendedFaceShapes.filter((x) => x !== s) : [...form.recommendedFaceShapes, s]);

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      <Card variant="bordered" padded className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Informations générales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nom" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          <Input label="SKU" value={form.sku} onChange={(e) => set("sku", e.target.value)} required />
          <Input label="Slug (URL)" value={form.slug} onChange={(e) => set("slug", e.target.value)} hint="Laisser vide pour générer depuis le nom" />
          <Select label="Marque" value={form.brandId} onChange={(e) => set("brandId", e.target.value)} placeholder="Aucune" options={brands.map((b) => ({ value: b.id, label: b.name }))} />
        </div>
        <Textarea label="Description courte" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} rows={2} />
        <Textarea label="Description complète" value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Statut" value={form.status} onChange={(e) => set("status", e.target.value)} options={[{ value: "DRAFT", label: "Brouillon" }, { value: "ACTIVE", label: "Actif" }, { value: "ARCHIVED", label: "Archivé" }]} />
          <Select label="Genre" value={form.gender} onChange={(e) => set("gender", e.target.value)} options={[{ value: "MEN", label: "Homme" }, { value: "WOMEN", label: "Femme" }, { value: "UNISEX", label: "Mixte" }, { value: "KIDS", label: "Enfant" }]} />
          <Select label="Âge" value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value)} options={[{ value: "ADULT", label: "Adulte" }, { value: "TEEN", label: "Ado" }, { value: "CHILD", label: "Enfant" }]} />
        </div>
        <div className="flex flex-wrap gap-4">
          <Checkbox label="Nouveauté" checked={form.isNew} onChange={(e) => set("isNew", e.target.checked)} />
          <Checkbox label="Best-seller" checked={form.isBestseller} onChange={(e) => set("isBestseller", e.target.checked)} />
          <Checkbox label="Vedette" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
        </div>
      </Card>

      <Card variant="bordered" padded className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Prix</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={`Prix (${currency})`} value={priceInput} onChange={(e) => setPriceInput(e.target.value)} inputMode="decimal" required />
          <Input label={`Prix barré (${currency})`} value={compareInput} onChange={(e) => setCompareInput(e.target.value)} inputMode="decimal" hint="Facultatif — affiche une promo" />
        </div>
      </Card>

      <Card variant="bordered" padded className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Monture</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Forme" value={form.frameShape} onChange={(e) => set("frameShape", e.target.value)} placeholder="—" options={FRAME_SHAPES.map((s) => ({ value: s, label: s }))} />
          <Select label="Matière" value={form.frameMaterial} onChange={(e) => set("frameMaterial", e.target.value)} placeholder="—" options={FRAME_MATERIALS.map((s) => ({ value: s, label: s }))} />
          <Select label="Type" value={form.frameType} onChange={(e) => set("frameType", e.target.value)} placeholder="—" options={FRAME_TYPES.map((s) => ({ value: s, label: s }))} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Formes de visage recommandées (visagisme)</p>
          <div className="flex flex-wrap gap-2">
            {FACE_SHAPES.map((s) => (
              <button key={s} type="button" onClick={() => toggleFace(s)} className={`rounded-full border px-3 py-1 text-sm ${form.recommendedFaceShapes.includes(s) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{s}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card variant="bordered" padded>
        <h2 className="mb-3 font-heading text-lg font-semibold">Catégories</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((c) => (
            <Checkbox key={c.id} label={c.parentId ? `— ${c.name}` : c.name} checked={form.categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
          ))}
        </div>
      </Card>

      <Card variant="bordered" padded>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Variantes (couleur / taille / stock)</h2>
          <Button variant="outline" size="sm" onClick={addVariant}><Plus size={16} /> Ajouter</Button>
        </div>
        {form.variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune variante. Ajoutez au moins une variante pour gérer le stock.</p>
        ) : (
          <div className="space-y-3">
            {form.variants.map((v, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded border border-border p-3 sm:grid-cols-6">
                <Input label="SKU" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} />
                <Input label="Nom" value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} />
                <Input label="Couleur" value={v.colorName} onChange={(e) => updateVariant(i, { colorName: e.target.value })} />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Teinte</span>
                  <input type="color" aria-label="Teinte" value={v.colorHex || "#000000"} onChange={(e) => updateVariant(i, { colorHex: e.target.value })} className="h-10 w-full rounded border border-border" />
                </label>
                <Input label="Taille" value={v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} />
                <div className="flex items-end gap-2">
                  <Input label="Stock" type="number" value={String(v.stock)} onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })} />
                  <button type="button" onClick={() => removeVariant(i)} aria-label="Supprimer" className="mb-2.5 text-muted-foreground hover:text-error"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} loading={pending}><Save size={18} /> Enregistrer</Button>
        <Button variant="outline" onClick={() => router.push("/produits")}>Annuler</Button>
        {form.id && (
          <>
            <Button variant="ghost" onClick={() => startTransition(() => { void duplicateProductAction(form.id!); })}>Dupliquer</Button>
            <button
              type="button"
              onClick={() => { if (confirm("Archiver ce produit ?")) startTransition(async () => { await deleteProductAction(form.id!); router.push("/produits"); }); }}
              className="ml-auto text-sm text-error hover:underline"
            >
              Archiver
            </button>
          </>
        )}
      </div>
    </div>
  );
}
