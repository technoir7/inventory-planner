"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { FormField, inputClass, selectClass } from "@/components/form-field";
import { DeleteButton } from "@/components/delete-button";

type Item = { id: string; name: string; category: string; unitOfMeasure: string; costPerUnit: unknown };
type Supplier = { id: string; name: string };
type POLine = {
  id: string;
  itemId: string;
  quantity: unknown;
  unitCost: unknown;
  item?: Item;
};
type PO = {
  id: string;
  supplierId: string;
  orderDate: string;
  expectedReceiptDate: string;
  status: string;
  supplier?: Supplier;
  lines: POLine[];
};

function num(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val) || 0;
  if (typeof val === "object" && val !== null && "toNumber" in val) return (val as { toNumber: () => number }).toNumber();
  return Number(val) || 0;
}

function dateStr(val: string | null | undefined): string {
  if (!val) return "";
  return new Date(val).toISOString().slice(0, 10);
}

type FormLine = { itemId: string; quantity: string; unitCost: string };

const today = new Date().toISOString().slice(0, 10);
const emptyForm = {
  supplierId: "",
  orderDate: today,
  expectedReceiptDate: "",
  status: "OPEN",
  lines: [{ itemId: "", quantity: "", unitCost: "" }] as FormLine[]
};

export default function ManagePurchaseOrdersPage() {
  const [pos, setPos] = useState<PO[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const materialItems = items.filter((i) => i.category !== "FINISHED_GOOD");

  const loadData = useCallback(async () => {
    const [posRes, itemsRes, suppliersRes] = await Promise.all([
      fetch("/api/purchase-orders"),
      fetch("/api/items"),
      fetch("/api/suppliers")
    ]);
    setPos(await posRes.json());
    setItems(await itemsRes.json());
    setSuppliers(await suppliersRes.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(po: PO) {
    setEditingId(po.id);
    setForm({
      supplierId: po.supplierId,
      orderDate: dateStr(po.orderDate),
      expectedReceiptDate: dateStr(po.expectedReceiptDate),
      status: po.status,
      lines: po.lines.map((l) => ({
        itemId: l.itemId,
        quantity: num(l.quantity).toString(),
        unitCost: num(l.unitCost).toString()
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
    setForm({ ...form, lines: [...form.lines, { itemId: "", quantity: "", unitCost: "" }] });
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
      supplierId: form.supplierId,
      orderDate: form.orderDate,
      expectedReceiptDate: form.expectedReceiptDate,
      status: form.status,
      lines: form.lines
        .filter((l) => l.itemId && l.quantity)
        .map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost) || 0
        }))
    };

    try {
      const url = editingId ? `/api/purchase-orders/${editingId}` : "/api/purchase-orders";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save PO");
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
      <SectionCard title="Manage Purchase Orders" subtitle="Create and edit purchase orders with line items">
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-black/5 bg-sand/30 p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Supplier" htmlFor="supplierId">
              <select id="supplierId" className={selectClass} value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required>
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Order Date" htmlFor="orderDate">
              <input id="orderDate" type="date" className={inputClass} value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} required />
            </FormField>
            <FormField label="Expected Receipt" htmlFor="expectedReceiptDate">
              <input id="expectedReceiptDate" type="date" className={inputClass} value={form.expectedReceiptDate} onChange={(e) => setForm({ ...form, expectedReceiptDate: e.target.value })} required />
            </FormField>
            <FormField label="Status" htmlFor="status">
              <select id="status" className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="OPEN">Open</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </FormField>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Line Items</p>
              <button type="button" onClick={addLine} className="rounded-lg border border-pine/20 px-3 py-1 text-xs font-medium text-pine hover:bg-pine/5">
                + Add Line
              </button>
            </div>
            <div className="grid gap-2">
              {form.lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className={selectClass + " flex-1"}
                    value={line.itemId}
                    onChange={(e) => updateLine(i, "itemId", e.target.value)}
                    required
                  >
                    <option value="">Select item...</option>
                    {materialItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unitOfMeasure})</option>
                    ))}
                  </select>
                  <input type="number" step="0.001" className={inputClass + " w-24"} placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} required />
                  <input type="number" step="0.0001" className={inputClass + " w-28"} placeholder="Unit Cost" value={line.unitCost} onChange={(e) => updateLine(i, "unitCost", e.target.value)} />
                  {form.lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)} className="text-xs text-coral hover:text-coral/80">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine/90 disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update PO" : "Create PO"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink hover:bg-sand/40">Cancel</button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        </form>

        <div className="grid gap-4">
          {pos.map((po) => (
            <div key={po.id} className="rounded-xl border border-black/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{po.supplier?.name ?? po.supplierId}</p>
                  <p className="text-xs text-ink/60">
                    Ordered {dateStr(po.orderDate)} &middot; Expected {dateStr(po.expectedReceiptDate)} &middot;
                    <span className={`ml-1 font-medium ${po.status === "OPEN" ? "text-pine" : po.status === "CANCELLED" ? "text-coral" : "text-amber"}`}>
                      {po.status.replace("_", " ")}
                    </span>
                  </p>
                </div>
                <span className="flex items-center gap-3">
                  <button onClick={() => startEdit(po)} className="text-xs text-pine hover:text-pine/80">Edit</button>
                  <DeleteButton endpoint={`/api/purchase-orders/${po.id}`} label="PO" onDeleted={loadData} />
                </span>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs uppercase tracking-wider text-ink/60">
                    <th className="pb-1 pr-4">Item</th>
                    <th className="pb-1 pr-4">Qty</th>
                    <th className="pb-1 pr-4">Unit Cost</th>
                    <th className="pb-1 pr-4">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {po.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-1 pr-4">{line.item?.name ?? line.itemId}</td>
                      <td className="py-1 pr-4">{num(line.quantity)}</td>
                      <td className="py-1 pr-4">${num(line.unitCost).toFixed(4)}</td>
                      <td className="py-1 pr-4">${(num(line.quantity) * num(line.unitCost)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-black/10 font-medium">
                    <td className="pt-1" colSpan={3}>PO Total</td>
                    <td className="pt-1">${po.lines.reduce((sum, l) => sum + num(l.quantity) * num(l.unitCost), 0).toFixed(2)}</td>
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
