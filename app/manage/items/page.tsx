"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { FormField, inputClass, selectClass } from "@/components/form-field";
import { DeleteButton } from "@/components/delete-button";

type Item = {
  id: string;
  name: string;
  category: string;
  unitOfMeasure: string;
  shelfLifeDays: number | null;
  leadTimeDays: number;
  minimumOrderQuantity: { toNumber?: () => number } | number;
  orderMultiple: { toNumber?: () => number } | number;
  costPerUnit: { toNumber?: () => number } | number;
  organicFlag: boolean;
  safetyStock: { toNumber?: () => number } | number;
  defaultSupplierId: string | null;
};

type Supplier = {
  id: string;
  name: string;
};

function num(val: { toNumber?: () => number } | number | string | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val) || 0;
  if (typeof val === "object" && "toNumber" in val && typeof val.toNumber === "function") return val.toNumber();
  return Number(val) || 0;
}

const emptyForm = {
  name: "",
  category: "RAW_MATERIAL",
  unitOfMeasure: "",
  shelfLifeDays: "",
  leadTimeDays: "0",
  minimumOrderQuantity: "0",
  orderMultiple: "1",
  costPerUnit: "0",
  organicFlag: false,
  safetyStock: "0",
  defaultSupplierId: ""
};

export default function ManageItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    const [itemsRes, suppliersRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/suppliers")
    ]);
    setItems(await itemsRes.json());
    setSuppliers(await suppliersRes.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(item: Item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      unitOfMeasure: item.unitOfMeasure,
      shelfLifeDays: item.shelfLifeDays?.toString() ?? "",
      leadTimeDays: item.leadTimeDays.toString(),
      minimumOrderQuantity: num(item.minimumOrderQuantity).toString(),
      orderMultiple: num(item.orderMultiple).toString(),
      costPerUnit: num(item.costPerUnit).toString(),
      organicFlag: item.organicFlag,
      safetyStock: num(item.safetyStock).toString(),
      defaultSupplierId: item.defaultSupplierId ?? ""
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
      name: form.name,
      category: form.category,
      unitOfMeasure: form.unitOfMeasure,
      shelfLifeDays: form.shelfLifeDays ? Number(form.shelfLifeDays) : null,
      leadTimeDays: Number(form.leadTimeDays) || 0,
      minimumOrderQuantity: Number(form.minimumOrderQuantity) || 0,
      orderMultiple: Number(form.orderMultiple) || 1,
      costPerUnit: Number(form.costPerUnit) || 0,
      organicFlag: form.organicFlag,
      safetyStock: Number(form.safetyStock) || 0,
      defaultSupplierId: form.defaultSupplierId || null
    };

    try {
      const url = editingId ? `/api/items/${editingId}` : "/api/items";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save item");
      }

      cancelEdit();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const filteredItems = filterCategory === "ALL"
    ? items.filter((i) => i.category !== "FINISHED_GOOD")
    : items.filter((i) => i.category === filterCategory);

  return (
    <div className="grid gap-6">
      <SectionCard title="Manage Items" subtitle="Create, edit, and delete raw materials and packaging items">
        <form onSubmit={handleSubmit} className="mb-6 grid gap-4 rounded-2xl border border-black/5 bg-sand/30 p-4 md:grid-cols-3">
          <FormField label="Name" htmlFor="name">
            <input id="name" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Category" htmlFor="category">
            <select id="category" className={selectClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="RAW_MATERIAL">Raw Material</option>
              <option value="PACKAGING">Packaging</option>
            </select>
          </FormField>
          <FormField label="Unit of Measure" htmlFor="unitOfMeasure">
            <input id="unitOfMeasure" className={inputClass} value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} required placeholder="ml, g, ea" />
          </FormField>
          <FormField label="Cost Per Unit" htmlFor="costPerUnit">
            <input id="costPerUnit" type="number" step="0.0001" className={inputClass} value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
          </FormField>
          <FormField label="Lead Time (days)" htmlFor="leadTimeDays">
            <input id="leadTimeDays" type="number" className={inputClass} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
          </FormField>
          <FormField label="Shelf Life (days)" htmlFor="shelfLifeDays" hint="Leave blank for non-perishable">
            <input id="shelfLifeDays" type="number" className={inputClass} value={form.shelfLifeDays} onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value })} placeholder="Optional" />
          </FormField>
          <FormField label="MOQ" htmlFor="minimumOrderQuantity">
            <input id="minimumOrderQuantity" type="number" step="0.001" className={inputClass} value={form.minimumOrderQuantity} onChange={(e) => setForm({ ...form, minimumOrderQuantity: e.target.value })} />
          </FormField>
          <FormField label="Order Multiple" htmlFor="orderMultiple">
            <input id="orderMultiple" type="number" step="0.001" className={inputClass} value={form.orderMultiple} onChange={(e) => setForm({ ...form, orderMultiple: e.target.value })} />
          </FormField>
          <FormField label="Safety Stock" htmlFor="safetyStock">
            <input id="safetyStock" type="number" step="0.001" className={inputClass} value={form.safetyStock} onChange={(e) => setForm({ ...form, safetyStock: e.target.value })} />
          </FormField>
          <FormField label="Default Supplier" htmlFor="defaultSupplierId">
            <select id="defaultSupplierId" className={selectClass} value={form.defaultSupplierId} onChange={(e) => setForm({ ...form, defaultSupplierId: e.target.value })}>
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Organic" htmlFor="organicFlag">
            <label className="flex items-center gap-2 text-sm">
              <input id="organicFlag" type="checkbox" checked={form.organicFlag} onChange={(e) => setForm({ ...form, organicFlag: e.target.checked })} />
              Certified organic
            </label>
          </FormField>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine/90 disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update Item" : "Add Item"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink hover:bg-sand/40">
                Cancel
              </button>
            )}
          </div>
          {error && <p className="col-span-full text-sm text-coral">{error}</p>}
        </form>

        <div className="mb-3 flex gap-2">
          {["ALL", "RAW_MATERIAL", "PACKAGING"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${filterCategory === cat ? "bg-pine text-white" : "bg-sand/60 text-ink hover:bg-sand"}`}
            >
              {cat === "ALL" ? "All" : cat === "RAW_MATERIAL" ? "Raw Materials" : "Packaging"}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-ink/60">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Unit</th>
                <th className="pb-2 pr-4">Cost</th>
                <th className="pb-2 pr-4">Lead Time</th>
                <th className="pb-2 pr-4">MOQ</th>
                <th className="pb-2 pr-4">Safety Stock</th>
                <th className="pb-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-sand/20">
                  <td className="py-2 pr-4 font-medium">{item.name}</td>
                  <td className="py-2 pr-4 text-xs">{item.category.replace("_", " ")}</td>
                  <td className="py-2 pr-4">{item.unitOfMeasure}</td>
                  <td className="py-2 pr-4">${num(item.costPerUnit).toFixed(4)}</td>
                  <td className="py-2 pr-4">{item.leadTimeDays}d</td>
                  <td className="py-2 pr-4">{num(item.minimumOrderQuantity)}</td>
                  <td className="py-2 pr-4">{num(item.safetyStock)}</td>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-3">
                      <button onClick={() => startEdit(item)} className="text-xs text-pine hover:text-pine/80">Edit</button>
                      <DeleteButton endpoint={`/api/items/${item.id}`} label={item.name} onDeleted={loadData} />
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
