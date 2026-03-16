"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { FormField, inputClass } from "@/components/form-field";
import { DeleteButton } from "@/components/delete-button";

type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  leadTimeDays: number;
};

const emptyForm = { name: "", contact: "", leadTimeDays: "0" };

export default function ManageSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/suppliers");
    setSuppliers(await res.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({ name: s.name, contact: s.contact ?? "", leadTimeDays: s.leadTimeDays.toString() });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      contact: form.contact || null,
      leadTimeDays: Number(form.leadTimeDays) || 0
    };

    try {
      const url = editingId ? `/api/suppliers/${editingId}` : "/api/suppliers";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save supplier");
      }

      cancelEdit();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <SectionCard title="Manage Suppliers" subtitle="Create, edit, and delete supplier records">
        <form onSubmit={handleSubmit} className="mb-6 grid gap-4 rounded-2xl border border-black/5 bg-sand/30 p-4 md:grid-cols-3">
          <FormField label="Name" htmlFor="name">
            <input id="name" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Contact" htmlFor="contact" hint="Email or phone">
            <input id="contact" className={inputClass} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Optional" />
          </FormField>
          <FormField label="Lead Time (days)" htmlFor="leadTimeDays">
            <input id="leadTimeDays" type="number" className={inputClass} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
          </FormField>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine/90 disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update Supplier" : "Add Supplier"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink hover:bg-sand/40">Cancel</button>
            )}
          </div>
          {error && <p className="col-span-full text-sm text-coral">{error}</p>}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-ink/60">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Contact</th>
                <th className="pb-2 pr-4">Lead Time</th>
                <th className="pb-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-sand/20">
                  <td className="py-2 pr-4 font-medium">{s.name}</td>
                  <td className="py-2 pr-4">{s.contact ?? "N/A"}</td>
                  <td className="py-2 pr-4">{s.leadTimeDays}d</td>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-3">
                      <button onClick={() => startEdit(s)} className="text-xs text-pine hover:text-pine/80">Edit</button>
                      <DeleteButton endpoint={`/api/suppliers/${s.id}`} label={s.name} onDeleted={loadData} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
