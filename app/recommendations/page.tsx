import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { DataTable } from "@/components/table";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { getPlanningSnapshot } from "@/lib/planning/service";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const snapshot = await getPlanningSnapshot();

  if (snapshot.recommendations.length === 0) {
    return (
      <SectionCard
        title="Purchase Recommendations"
        subtitle="Calculated from dependent demand, supplier lead times, safety stock, MOQ, and order multiple"
      >
        <p className="text-sm text-ink/70">No active recommendations in the current 30-day planning window.</p>
      </SectionCard>
    );
  }

  return (
    <div className="grid gap-6">
      {snapshot.recommendations.map((recommendation) => {
        const relevantDemand = recommendation.explanation.datedDemand.filter(
          (entry) => entry.insideLeadTimeWindow || entry.beforeNextReceiptWindow || entry.shortageQuantity > 0
        );

        return (
          <SectionCard
            key={recommendation.itemId}
            title={`${recommendation.itemName} · Buy ${formatNumber(recommendation.recommendedQty)}`}
            subtitle={recommendation.reason}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-2xl bg-sand/55 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-pine">Usable Now</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {formatNumber(recommendation.explanation.currentUsableInventory)}
                  </p>
                </div>
                <div className="rounded-2xl bg-sand/55 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-pine">Reorder Point</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {formatNumber(recommendation.explanation.reorderPoint)}
                  </p>
                </div>
                <div className="rounded-2xl bg-sand/55 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-pine">Safety Stock</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {formatNumber(recommendation.explanation.safetyStock)}
                  </p>
                </div>
                <div className="rounded-2xl bg-sand/55 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-pine">Raw Need</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {formatNumber(recommendation.explanation.orderingAdjustment.rawRequiredQty)}
                  </p>
                </div>
                <div className="rounded-2xl bg-sand/55 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-pine">Rounded Buy</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {formatNumber(recommendation.explanation.orderingAdjustment.roundedQty)}
                  </p>
                </div>
                <div className="rounded-2xl bg-sand/55 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-pine">Order By</p>
                  <p className="mt-1 text-lg font-semibold text-ink">{formatDate(recommendation.orderByDate)}</p>
                </div>
              </div>

              <Link
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-sand/40"
                href={`/items/${recommendation.itemId}`}
              >
                Open Planning Trace
              </Link>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">Order Adjustment</h3>
                <p className="mt-3 text-sm text-ink/80">
                  Raw buy need {formatNumber(recommendation.explanation.orderingAdjustment.rawRequiredQty)} was rounded
                  to {formatNumber(recommendation.explanation.orderingAdjustment.roundedQty)}.
                </p>
                <ul className="mt-3 space-y-2 text-sm text-ink/75">
                  <li>
                    MOQ {formatNumber(recommendation.explanation.orderingAdjustment.minimumOrderQuantity)}:{" "}
                    {recommendation.explanation.orderingAdjustment.moqApplied ? "applied" : "not binding"}
                  </li>
                  <li>
                    Order multiple {formatNumber(recommendation.explanation.orderingAdjustment.orderMultiple)}:{" "}
                    {recommendation.explanation.orderingAdjustment.orderMultipleApplied
                      ? "rounded up"
                      : "no extra multiple adjustment"}
                  </li>
                  <li>
                    Added over raw need: {formatNumber(recommendation.explanation.orderingAdjustment.roundedUpBy)}
                  </li>
                  <li>
                    Projected inventory at receipt: {formatNumber(recommendation.explanation.projectedInventoryAtReceipt)}
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">Expiry Influence</h3>
                <p className="mt-3 text-sm text-ink/80">
                  {recommendation.explanation.expiryRiskInfluenced
                    ? "Expiry or already-expired inventory reduced trust in available stock."
                    : "No expiry loss changed this recommendation inside the current horizon."}
                </p>
                {recommendation.explanation.expiryRiskNotes.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-ink/75">
                    {recommendation.explanation.expiryRiskNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-ink/60">No expiry-risk adjustments for this item.</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-pine">
                  Inbound Inventory By Date
                </h3>
                {recommendation.explanation.inboundInventory.length > 0 ? (
                  <DataTable
                    headers={["Date", "Qty", "Source", "Reference"]}
                    rows={recommendation.explanation.inboundInventory.map((receipt) => [
                      formatDate(receipt.date),
                      formatNumber(receipt.quantity),
                      receipt.sourceType.replace("_", " "),
                      receipt.referenceLabel
                    ])}
                  />
                ) : (
                  <p className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-ink/60">
                    No inbound inventory is scheduled for this item.
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-pine">
                  Dated Demand Driving The Recommendation
                </h3>
                {relevantDemand.length > 0 ? (
                  <DataTable
                    headers={["Date", "Finished Good", "Demand", "Fulfilled", "Shortage", "Window"]}
                    rows={relevantDemand.map((entry) => [
                      formatDate(entry.date),
                      entry.sourceFinishedGoodName,
                      formatNumber(entry.quantity),
                      formatNumber(entry.fulfilledQuantity),
                      formatNumber(entry.shortageQuantity),
                      entry.shortageQuantity > 0
                        ? "Blocked"
                        : entry.beforeNextReceiptWindow
                          ? "Before receipt"
                          : entry.insideLeadTimeWindow
                            ? "Lead time"
                            : "Later horizon"
                    ])}
                  />
                ) : (
                  <p className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-ink/60">
                    No dated demand events contributed to this recommendation.
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}
