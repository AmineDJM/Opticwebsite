"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Card, Button, Input, Textarea, Checkbox, Badge, Alert } from "@optic/ui";
import { saveBrandAction, deleteBrandAction } from "../server/actions/catalog-admin.js";

interface Brand { id: string; name: string; slug: string; description: string | null; story: string | null; isExclusive: boolean; isFeatured: boolean; isActive: boolean; productCount: number }

/** Brand management incl. the exclusive Momus flag (§24) — a configurable data flag. */
export function BrandsManager({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await saveBrandAction(editing);
      if (result.ok) { setEditing(null); router.refresh(); }
      else setError(result.error ?? "Erreur");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Marques</h1>
        <Button onClick={() => setEditing({ isActive: true })}><Plus size={18} /> Nouvelle marque</Button>
      </div>

      {editing && (
        <Card variant="bordered" padded className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nom" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input label="Slug" value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} hint="Vide = auto" />
          </div>
          <Textarea label="Description" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
          <Textarea label="Storytelling (page marque)" value={editing.story ?? ""} onChange={(e) => setEditing({ ...editing, story: e.target.value })} rows={3} />
          <div className="flex flex-wrap gap-4">
            <Checkbox label="Marque exclusive" checked={editing.isExclusive ?? false} onChange={(e) => setEditing({ ...editing, isExclusive: e.target.checked })} />
            <Checkbox label="Mise en avant" checked={editing.isFeatured ?? false} onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })} />
            <Checkbox label="Active" checked={editing.isActive ?? true} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
          </div>
          <div className="flex gap-2"><Button onClick={save} loading={pending}>Enregistrer</Button><Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button></div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {brands.map((b) => (
          <Card key={b.id} variant="bordered" padded>
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-2 font-medium">{b.name}{b.isExclusive && <Badge variant="accent"><Star size={11} /> Exclusive</Badge>}</p>
                <p className="text-xs text-muted-foreground">/{b.slug} · {b.productCount} produit(s)</p>
              </div>
              <span className="flex gap-1">
                <button onClick={() => setEditing(b)} aria-label="Modifier" className="rounded p-1.5 hover:bg-muted"><Pencil size={16} /></button>
                <button onClick={() => confirm(`Désactiver « ${b.name} » ?`) && startTransition(async () => { await deleteBrandAction(b.id); router.refresh(); })} aria-label="Désactiver" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-error"><Trash2 size={16} /></button>
              </span>
            </div>
            {b.description && <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
