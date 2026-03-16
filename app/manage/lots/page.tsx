"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { FormField, inputClass, selectClass } from "@/components/form-field";
import { DeleteButton } from "@/components/delete-button";

type Item = { id: string; name: string; category: string; unitOfMeasure: string };
type Lot = {
  id: string;
  itemId: string;
  lotCode: string;
  receivedDate: string;
  expirationDate: string | null;
  quantityAvailable: number | string;
  quantityAllocated: number | string;
  item?: Item;
};

function num(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return Number(val) || 0;
}

function dateStr(val: string | null | undefined): string {
  if (!val) return "";
  return new Date(val).toISOString().slice(0, 10);
}

const emptyForm = {
  itemId: "",
  lotCode: "",
  receivedDate: new Date().toISOString().slice(0, 10),
  expirationDate: "",
  quantityAvailable: "0",
  quantityAllocated: "0"
};

export default function ManageLotsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const materialItems = items.filter((i) => i.category !== "FINISHED_GOOD");

  const loadData = useCallback(async () => {
    const [lotsRes, itemsRes] = await Promise.all([
      fetch("/api/inventory-lots"),
      fetch("/api/items")
    ]);
    setLots(await lotsRes.json());
    setItems(await itemsRes.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(lot: Lot) {
    setEditingId(lot.id);
    setForm({
      itemId: lot.itemId,
      lotCode: lot.lotCode,
      receivedDate: dateStr(lot.receivedDate),
      expirationDate: dateStr(lot.expirationDate),
      quantityAvailable: num(lot.quantityAvailable).toString(),
      quantityAllocated: num(lot.quantityAllocated).toString()
    });
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
      itemId: form.itemId,
      lotCode: form.lotCode,
      receivedDate: form.receivedDate,
      expirationDate: form.expirationDate || null,
      quantityAvailable: Number(form.quantityAvailable) || 0,
      quantityAllocated: Number(form.quantityAllocated) || 0
    };

    try {
      const url = editingId ? `/api/inventory-lots/${editingId}` : "/api/inventory-lots";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save lot");
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
      <SectionCard title="Manage Inventory Lots" subtitle="Create, edit, and track individual inventory lots with FEFO data">
        <form onSubmit={handleSubmit} className="mb-6 grid gap-4 rounded-2xl border border-black/5 bg-sand/30 p-4 md:grid-cols-3">
          <FormField label="Item" htmlFor="itemId">
            <select id="itemId" className={selectClass} value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} required>
              <option value="">Select item...</option>
              {materialItems.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.unitOfMeasure})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Lot Code" htmlFor="lotCode">
            <input id="lotCode" className={inputClass} value={form.lotCode} onChange={(e) => setForm({ ...form, lotCode: e.target.value })} required />
          </FormField>
          <FormField label="Received Date" htmlFor="receivedDate">
            <input id="receivedDate" type="date" className={inputClass} value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} required />
          </FormField>
          <FormField label="Expiration Date" htmlFor="expirationDate" hint="Leave blank for non-perishable">
            <input id="expirationDate" type="date" className={inputClass} value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} />
          </FormField>
          <FormField label="Qty Available" htmlFor="quantityAvailable">
            <input id="quantityAvailable" type="number" step="0.001" className={inputClass} value={form.quantityAvailable} onChange={(e) => setForm({ ...form, quantityAvailable: e.target.value })} />
          </FormField>
          <FormField label="Qty Allocated" htmlFor="quantityAllocated">
            <input id="quantityAllocated" type="number" step="0.001" className={inputClass} value={form.quantityAllocated} onChange={(e) => setForm({ ...form, quantityAllocated: e.target.value })} />
          </FormField>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine/90 disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update Lot" : "Add Lot"}
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
                <th className="pb-2 pr-4">Item</th>
                <th className="pb-2 pr-4">Lot Code</th>
                <th className="pb-2 pr-4">Received</th>
                <th className="pb-2 pr-4">Expires</th>
                <th className="pb-2 pr-4">Available</th>
                <th className="pb-2 pr-4">Allocated</th>
                <th className="pb-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {lots.map((lot) => (
                <tr key={lot.id} className="hover:bg-sand/20">
                  <td className="py-2 pr-4 font-medium">{lot.item?.name ?? lot.itemId}</td>
                  <td className="py-2 pr-4">{lot.lotCode}</td>
                  <td className="py-2 pr-4">{dateStr(lot.receivedDate)}</td>
                  <td className="py-2 pr-4">{dateStr(lot.expirationDate) || "N/A"}</td>
                  <td className="py-2 pr-4">{num(lot.quantityAvailable)}</td>
                  <td className="py-2 pr-4">{num(lot.quantityAllocated)}</td>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-3">
                      <button onClick={() => startEdit(lot)} className="text-xs text-pine hover:text-pine/80">Edit</button>
                      <DeleteButton endpoint={`/api/inventory-lots/${lot.id}`} label={lot.lotCode} onDeleted={loadData} />
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
