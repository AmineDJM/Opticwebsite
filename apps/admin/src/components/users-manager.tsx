"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, Button, Input, Select, Alert, Badge } from "@optic/ui";
import { inviteUserAction, changeRoleAction, removeUserAction } from "../server/actions/users.js";

interface Member { userId: string; name: string; email: string; isActive: boolean; roleId: string; roleName: string; lastLoginAt: Date | null }

export function UsersManager({ members, roles, canManage, currentUserId }: { members: Member[]; roles: { id: string; name: string; key: string }[]; canManage: boolean; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", roleId: roles[0]?.id ?? "" });
  const [error, setError] = useState<string | null>(null);

  function invite() {
    setError(null);
    startTransition(async () => {
      const result = await inviteUserAction(form);
      if (result.ok) { setInviting(false); setForm({ name: "", email: "", password: "", roleId: roles[0]?.id ?? "" }); router.refresh(); }
      else setError(result.error ?? "Erreur");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Utilisateurs &amp; rôles</h1>
        {canManage && <Button onClick={() => setInviting((v) => !v)}><Plus size={18} /> Inviter</Button>}
      </div>

      {inviting && (
        <Card variant="bordered" padded className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Mot de passe temporaire" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hint="8 caractères min." />
            <Select label="Rôle" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
          </div>
          <div className="flex gap-2"><Button onClick={invite} loading={pending}>Inviter</Button><Button variant="outline" onClick={() => setInviting(false)}>Annuler</Button></div>
        </Card>
      )}

      <div className="overflow-x-auto rounded border border-border bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Utilisateur</th><th className="p-3">Rôle</th><th className="p-3">Dernière connexion</th><th className="p-3"></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-border last:border-0">
                <td className="p-3"><span className="font-medium">{m.name}</span> {!m.isActive && <Badge variant="neutral">Inactif</Badge>}<br /><span className="text-xs text-muted-foreground">{m.email}</span></td>
                <td className="p-3">
                  {canManage && m.userId !== currentUserId ? (
                    <select defaultValue={m.roleId} onChange={(e) => startTransition(async () => { await changeRoleAction(m.userId, e.target.value); router.refresh(); })} className="rounded border border-border bg-surface px-2 py-1 text-sm">
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  ) : <span>{m.roleName}</span>}
                </td>
                <td className="p-3 text-xs text-muted-foreground">{m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString("fr-DZ") : "Jamais"}</td>
                <td className="p-3 text-right">
                  {canManage && m.userId !== currentUserId && (
                    <button onClick={() => confirm(`Retirer ${m.name} ?`) && startTransition(async () => { await removeUserAction(m.userId); router.refresh(); })} aria-label="Retirer" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-error"><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
