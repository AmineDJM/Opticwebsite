"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, Button, Input, Select, Checkbox, Badge, Alert } from "@optic/ui";
import { saveCategoryAction, deleteCategoryAction } from "../server/actions/catalog-admin.js";

interface Category { id: string; name: string; slug: string; parentId: string | null; kind: string; isActive: boolean; position: number; productCount: number }

const KINDS = [
  { value: "GENERIC", label: "Générique" },
  { value: "OPTICAL_FRAMES", label: "Montures médicales" },
  { value: "SUNGLASSES", label: "Solaires" },
  { value: "SUN_LENSES", label: "Verres solaires" },
  { value: "CONTACT_LENSES", label: "Lentilles" },
  { value: "ACCESSORIES", label: "Accessoires" },
];

/** Fully administrable category tree (§6). Never hardcoded in the storefront. */
export function CategoriesManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parents = categories.filter((c) => !c.parentId);

  function save() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await saveCategoryAction(editing);
      if (result.ok) { setEditing(null); router.refresh(); }
      else setError(result.error ?? "Erreur");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Catégories</h1>
        <Button onClick={() => setEditing({ kind: "GENERIC", isActive: true, position: parents.length })}><Plus size={18} /> Nouvelle catégorie</Button>
      </div>

      {editing && (
        <Card variant="bordered" padded className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nom" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input label="Slug" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} hint="Vide = auto" />
            <Select label="Parent" value={editing.parentId ?? ""} onChange={(e) => setEditing({ ...editing, parentId: e.target.value })} placeholder="Aucun (racine)" options={parents.filter((p) => p.id !== editing.id).map((p) => ({ value: p.id, label: p.name }))} />
            <Select label="Type" value={editing.kind ?? "GENERIC"} onChange={(e) => setEditing({ ...editing, kind: e.target.value })} options={KINDS} />
          </div>
          <Checkbox label="Active" checked={editing.isActive ?? true} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
          <div className="flex gap-2">
            <Button onClick={save} loading={pending}>Enregistrer</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
          </div>
        </Card>
      )}

      <div className="rounded border border-border bg-surface">
        {parents.map((parent) => (
          <div key={parent.id}>
            <Row cat={parent} onEdit={() => setEditing(parent)} onDelete={() => startTransition(async () => { await deleteCategoryAction(parent.id); router.refresh(); })} />
            {categories.filter((c) => c.parentId === parent.id).map((child) => (
              <Row key={child.id} cat={child} indent onEdit={() => setEditing(child)} onDelete={() => startTransition(async () => { await deleteCategoryAction(child.id); router.refresh(); })} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ cat, indent, onEdit, onDelete }: { cat: Category; indent?: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-0">
      <span className={indent ? "pl-6 text-sm" : "font-medium"}>
        {indent && <span className="text-muted-foreground">— </span>}{cat.name}
        <span className="ml-2 text-xs text-muted-foreground">/{cat.slug} · {cat.productCount} produit(s)</span>
        {!cat.isActive && <Badge variant="neutral" className="ml-2">Inactive</Badge>}
      </span>
      <span className="flex gap-1">
        <button onClick={onEdit} aria-label="Modifier" className="rounded p-1.5 hover:bg-muted"><Pencil size={16} /></button>
        <button onClick={() => confirm(`Supprimer « ${cat.name} » ?`) && onDelete()} aria-label="Supprimer" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-error"><Trash2 size={16} /></button>
      </span>
    </div>
  );
}
