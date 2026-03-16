"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { FormField, inputClass, selectClass } from "@/components/form-field";
import { DeleteButton } from "@/components/delete-button";

type Item = { id: string; name: string; category: string };
type PlanLine = {
  id: string;
  finishedGoodItemId: string;
  scheduledDate: string | null;
  quantity: number | string;
  finishedGoodItem?: Item;
};
type Plan = {
  id: string;
  startDate: string;
  endDate: string;
  lines: PlanLine[];
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

type FormLine = { finishedGoodItemId: string; scheduledDate: string; quantity: string };

const today = new Date().toISOString().slice(0, 10);
const emptyForm = {
  startDate: today,
  endDate: "",
  lines: [{ finishedGoodItemId: "", scheduledDate: "", quantity: "" }] as FormLine[]
};

export default function ManagePlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishedGoods = items.filter((i) => i.category === "FINISHED_GOOD");

  const loadData = useCallback(async () => {
    const [plansRes, itemsRes] = await Promise.all([
      fetch("/api/production-plans"),
      fetch("/api/items")
    ]);
    setPlans(await plansRes.json());
    setItems(await itemsRes.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setForm({
      startDate: dateStr(plan.startDate),
      endDate: dateStr(plan.endDate),
      lines: plan.lines.map((l) => ({
        finishedGoodItemId: l.finishedGoodItemId,
        scheduledDate: dateStr(l.scheduledDate),
        quantity: num(l.quantity).toString()
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
    setForm({ ...form, lines: [...form.lines, { finishedGoodItemId: "", scheduledDate: "", quantity: "" }] });
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
      startDate: form.startDate,
      endDate: form.endDate,
      lines: form.lines
        .filter((l) => l.finishedGoodItemId && l.quantity)
        .map((l) => ({
          finishedGoodItemId: l.finishedGoodItemId,
          scheduledDate: l.scheduledDate || null,
          quantity: Number(l.quantity)
        }))
    };

    try {
      const url = editingId ? `/api/production-plans/${editingId}` : "/api/production-plans";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save plan");
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
      <SectionCard title="Manage Production Plans" subtitle="Create and edit manufacturing schedules with dated production runs">
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-black/5 bg-sand/30 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Start Date" htmlFor="startDate">
              <input id="startDate" type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </FormField>
            <FormField label="End Date" htmlFor="endDate">
              <input id="endDate" type="date" className={inputClass} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </FormField>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Production Runs</p>
              <button type="button" onClick={addLine} className="rounded-lg border border-pine/20 px-3 py-1 text-xs font-medium text-pine hover:bg-pine/5">
                + Add Run
              </button>
            </div>
            <div className="grid gap-2">
              {form.lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className={selectClass + " flex-1"}
                    value={line.finishedGoodItemId}
                    onChange={(e) => updateLine(i, "finishedGoodItemId", e.target.value)}
                    required
                  >
                    <option value="">Select product...</option>
                    {finishedGoods.map((fg) => (
                      <option key={fg.id} value={fg.id}>{fg.name}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className={inputClass + " w-40"}
                    value={line.scheduledDate}
                    onChange={(e) => updateLine(i, "scheduledDate", e.target.value)}
                    placeholder="Scheduled"
                  />
                  <input
                    type="number"
                    step="0.001"
                    className={inputClass + " w-24"}
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, "quantity", e.target.value)}
                    required
                  />
                  {form.lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)} className="text-xs text-coral hover:text-coral/80">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine/90 disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update Plan" : "Create Plan"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink hover:bg-sand/40">Cancel</button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        </form>

        <div className="grid gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-black/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-ink">{dateStr(plan.startDate)} to {dateStr(plan.endDate)}</p>
                <span className="flex items-center gap-3">
                  <button onClick={() => startEdit(plan)} className="text-xs text-pine hover:text-pine/80">Edit</button>
                  <DeleteButton endpoint={`/api/production-plans/${plan.id}`} label="plan" onDeleted={loadData} />
                </span>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs uppercase tracking-wider text-ink/60">
                    <th className="pb-1 pr-4">Product</th>
                    <th className="pb-1 pr-4">Scheduled</th>
                    <th className="pb-1 pr-4">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {plan.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-1 pr-4">{line.finishedGoodItem?.name ?? line.finishedGoodItemId}</td>
                      <td className="py-1 pr-4">{dateStr(line.scheduledDate) || "Plan start"}</td>
                      <td className="py-1 pr-4">{num(line.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
