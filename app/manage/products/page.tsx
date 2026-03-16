"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { FormField, inputClass } from "@/components/form-field";
import { DeleteButton } from "@/components/delete-button";

type Item = {
  id: string;
  name: string;
  category: string;
  unitOfMeasure: string;
  costPerUnit: number | { toNumber?: () => number };
};

type BomLine = {
  id: string;
  componentItemId: string;
  quantityRequired: number | { toNumber?: () => number };
  componentItem?: Item;
};

type Bom = {
  id: string;
  finishedGoodItemId: string;
  batchSize: number | { toNumber?: () => number };
  yieldPercent: number | { toNumber?: () => number };
  targetPrice: number | { toNumber?: () => number } | null;
  fillSizeOz: number | { toNumber?: () => number } | null;
  labelDescription: string | null;
  finishedGoodItem?: Item;
  lines: BomLine[];
};

function num(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val) || 0;
  if (typeof val === "object" && val !== null && "toNumber" in val && typeof (val as { toNumber: () => number }).toNumber === "function")
    return (val as { toNumber: () => number }).toNumber();
  return Number(val) || 0;
}

type FormLine = { componentItemId: string; quantityRequired: string };

const emptyForm = {
  finishedGoodItemId: "",
  batchSize: "1",
  yieldPercent: "100",
  targetPrice: "",
  fillSizeOz: "",
  labelDescription: "",
  lines: [{ componentItemId: "", quantityRequired: "" }] as FormLine[]
};

export default function ManageProductsPage() {
  const [boms, setBoms] = useState<Bom[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishedGoods = items.filter((i) => i.category === "FINISHED_GOOD");
  const components = items.filter((i) => i.category !== "FINISHED_GOOD");

  const loadData = useCallback(async () => {
    const [bomsRes, itemsRes] = await Promise.all([
      fetch("/api/boms"),
      fetch("/api/items")
    ]);
    setBoms(await bomsRes.json());
    setItems(await itemsRes.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(bom: Bom) {
    setEditingId(bom.id);
    setForm({
      finishedGoodItemId: bom.finishedGoodItemId,
      batchSize: num(bom.batchSize).toString(),
      yieldPercent: num(bom.yieldPercent).toString(),
      targetPrice: bom.targetPrice != null ? num(bom.targetPrice).toString() : "",
      fillSizeOz: bom.fillSizeOz != null ? num(bom.fillSizeOz).toString() : "",
      labelDescription: bom.labelDescription ?? "",
      lines: bom.lines.map((l) => ({
        componentItemId: l.componentItemId,
        quantityRequired: num(l.quantityRequired).toString()
      }))
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  function addLine() {
    setForm({ ...form, lines: [...form.lines, { componentItemId: "", quantityRequired: "" }] });
  }

  function removeLine(index: number) {
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== index) });
  }

  function updateLine(index: number, field: keyof FormLine, value: string) {
    const updated = [...form.lines];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, lines: updated });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      finishedGoodItemId: form.finishedGoodItemId,
      batchSize: Number(form.batchSize) || 1,
      yieldPercent: Number(form.yieldPercent) || 100,
      targetPrice: form.targetPrice ? Number(form.targetPrice) : null,
      fillSizeOz: form.fillSizeOz ? Number(form.fillSizeOz) : null,
      labelDescription: form.labelDescription || null,
      lines: form.lines
        .filter((l) => l.componentItemId && l.quantityRequired)
        .map((l) => ({
          componentItemId: l.componentItemId,
          quantityRequired: Number(l.quantityRequired)
        }))
    };

    try {
      const url = editingId ? `/api/boms/${editingId}` : "/api/boms";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save BOM");
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
      <SectionCard title="Manage Products / BOMs" subtitle="Create and edit finished product formulas with ingredient lines">
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-black/5 bg-sand/30 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Finished Product" htmlFor="finishedGoodItemId">
              <select
                id="finishedGoodItemId"
                className={inputClass}
                value={form.finishedGoodItemId}
                onChange={(e) => setForm({ ...form, finishedGoodItemId: e.target.value })}
                required
                disabled={!!editingId}
              >
                <option value="">Select product...</option>
                {finishedGoods.map((fg) => (
                  <option key={fg.id} value={fg.id}>{fg.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Batch Size" htmlFor="batchSize">
              <input id="batchSize" type="number" step="0.001" className={inputClass} value={form.batchSize} onChange={(e) => setForm({ ...form, batchSize: e.target.value })} />
            </FormField>
            <FormField label="Yield %" htmlFor="yieldPercent">
              <input id="yieldPercent" type="number" step="0.01" className={inputClass} value={form.yieldPercent} onChange={(e) => setForm({ ...form, yieldPercent: e.target.value })} />
            </FormField>
            <FormField label="Target Price ($)" htmlFor="targetPrice" hint="Retail/wholesale target">
              <input id="targetPrice" type="number" step="0.01" className={inputClass} value={form.targetPrice} onChange={(e) => setForm({ ...form, targetPrice: e.target.value })} placeholder="Optional" />
            </FormField>
            <FormField label="Fill Size (oz)" htmlFor="fillSizeOz" hint="For cost-per-oz calculation">
              <input id="fillSizeOz" type="number" step="0.001" className={inputClass} value={form.fillSizeOz} onChange={(e) => setForm({ ...form, fillSizeOz: e.target.value })} placeholder="Optional" />
            </FormField>
            <FormField label="Label Description" htmlFor="labelDescription">
              <input id="labelDescription" className={inputClass} value={form.labelDescription} onChange={(e) => setForm({ ...form, labelDescription: e.target.value })} placeholder="Optional" />
            </FormField>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Ingredients</p>
              <button type="button" onClick={addLine} className="rounded-lg border border-pine/20 px-3 py-1 text-xs font-medium text-pine hover:bg-pine/5">
                + Add Ingredient
              </button>
            </div>
            <div className="grid gap-2">
              {form.lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className={inputClass + " flex-1"}
                    value={line.componentItemId}
                    onChange={(e) => updateLine(i, "componentItemId", e.target.value)}
                    required
                  >
                    <option value="">Select component...</option>
                    {components.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.unitOfMeasure})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.001"
                    className={inputClass + " w-28"}
                    placeholder="Qty"
                    value={line.quantityRequired}
                    onChange={(e) => updateLine(i, "quantityRequired", e.target.value)}
                    required
                  />
                  {form.lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)} className="text-xs text-coral hover:text-coral/80">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine/90 disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update BOM" : "Create BOM"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink hover:bg-sand/40">
                Cancel
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        </form>

        <div className="grid gap-4">
          {boms.map((bom) => (
            <div key={bom.id} className="rounded-xl border border-black/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{bom.finishedGoodItem?.name ?? "Unknown"}</p>
                  <p className="text-xs text-ink/60">
                    {bom.labelDescription && <span>{bom.labelDescription} &middot; </span>}
                    Batch: {num(bom.batchSize)} &middot; Yield: {num(bom.yieldPercent)}%
                    {bom.targetPrice != null && <span> &middot; Target: ${num(bom.targetPrice).toFixed(2)}</span>}
                    {bom.fillSizeOz != null && <span> &middot; Fill: {num(bom.fillSizeOz)} oz</span>}
                  </p>
                </div>
                <span className="flex items-center gap-3">
                  <button onClick={() => startEdit(bom)} className="text-xs text-pine hover:text-pine/80">Edit</button>
                  <DeleteButton endpoint={`/api/boms/${bom.id}`} label={bom.finishedGoodItem?.name ?? "BOM"} onDeleted={loadData} />
                </span>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs uppercase tracking-wider text-ink/60">
                    <th className="pb-1 pr-4">Ingredient</th>
                    <th className="pb-1 pr-4">Quantity</th>
                    <th className="pb-1 pr-4">Unit</th>
                    <th className="pb-1 pr-4">Unit Cost</th>
                    <th className="pb-1 pr-4">Line Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {bom.lines.map((line) => {
                    const qty = num(line.quantityRequired);
                    const cost = num(line.componentItem?.costPerUnit);
                    return (
                      <tr key={line.id}>
                        <td className="py-1 pr-4">{line.componentItem?.name ?? line.componentItemId}</td>
                        <td className="py-1 pr-4">{qty}</td>
                        <td className="py-1 pr-4">{line.componentItem?.unitOfMeasure ?? ""}</td>
                        <td className="py-1 pr-4">${cost.toFixed(4)}</td>
                        <td className="py-1 pr-4">${(qty * cost).toFixed(4)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-black/10 font-medium">
                    <td className="pt-1" colSpan={4}>Total Batch Cost</td>
                    <td className="pt-1">
                      ${bom.lines.reduce((sum, l) => sum + num(l.quantityRequired) * num(l.componentItem?.costPerUnit), 0).toFixed(4)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
