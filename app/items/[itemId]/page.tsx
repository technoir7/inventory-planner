import Link from "next/link";
import { notFound } from "next/navigation";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { DataTable } from "@/components/table";
import { formatDate } from "@/lib/dates";
import { formatNullableNumber, formatNumber } from "@/lib/format";
import { getPlanningSnapshot } from "@/lib/planning/service";

export const dynamic = "force-dynamic";

export default async function ItemTracePage({ params }: { params: { itemId: string } }) {
  const snapshot = await getPlanningSnapshot();
  const trace = snapshot.itemTraces[params.itemId];

  if (!trace) {
    notFound();
  }

  const metrics = snapshot.inventoryMetrics.find((entry) => entry.itemId === trace.itemId);
  const recommendation = snapshot.recommendations.find((entry) => entry.itemId === trace.itemId);
  const alerts = snapshot.alerts.filter((entry) => entry.itemId === trace.itemId);

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-pine">Planning Trace</p>
          <h2 className="text-3xl font-semibold text-ink">{trace.itemName}</h2>
          <p className="mt-2 text-sm text-ink/70">
            Inspectable planner trace for {trace.category.replace("_", " ").toLowerCase()} inventory in{" "}
            {trace.unitOfMeasure}.
          </p>
        </div>
        <Link
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-sand/40"
          href="/recommendations"
        >
          Back To Recommendations
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Usable Inventory"
          value={formatNumber(trace.currentUsableInventory)}
          detail="Received, non-expired inventory net of current allocations."
        />
        <MetricCard
          label="Reorder Point"
          value={formatNumber(trace.reorderPoint)}
          detail={`Includes safety stock of ${formatNumber(trace.safetyStock)}.`}
        />
        <MetricCard
          label="First Shortage"
          value={formatDate(trace.firstShortageDate)}
          detail="First dated production run the planner could not fully cover."
        />
        <MetricCard
          label="Expiry Waste"
          value={formatNumber(trace.projectedExpiryWaste)}
          detail="Projected lot loss inside the current planning horizon."
        />
      </section>

      {alerts.length > 0 ? (
        <SectionCard title="Alert Why" subtitle="Planner explanation behind active alerts for this item">
          <DataTable
            headers={["Type", "Severity", "Message", "Why"]}
            rows={alerts.map((alert) => [
              alert.alertType.replace("_", " "),
              alert.severity,
              alert.message,
              alert.why?.summary ?? "No additional trace attached."
            ])}
          />
        </SectionCard>
      ) : null}

      <SectionCard title="Inventory Lots In FEFO Order" subtitle="Earlier-expiring lots are consumed first">
        <DataTable
          headers={["Lot", "Received", "Expiration", "Allocated", "Usable Start", "Consumed", "Waste", "Remaining"]}
          rows={trace.lotsInFefoOrder.map((lot) => [
            lot.lotCode,
            formatDate(lot.receivedDate),
            formatDate(lot.expirationDate),
            formatNumber(lot.quantityAllocated),
            formatNumber(lot.startingUsableQuantity),
            formatNumber(lot.projectedConsumedQuantity),
            formatNumber(lot.projectedWasteQuantity),
            formatNumber(lot.projectedRemainingQuantity)
          ])}
        />
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Inbound Inventory" subtitle="Future receipts available to this item by date">
          {trace.inboundInventory.length > 0 ? (
            <DataTable
              headers={["Date", "Qty", "Source", "Reference"]}
              rows={trace.inboundInventory.map((receipt) => [
                formatDate(receipt.date),
                formatNumber(receipt.quantity),
                receipt.sourceType.replace("_", " "),
                receipt.referenceLabel
              ])}
            />
          ) : (
            <p className="text-sm text-ink/60">No inbound receipts are scheduled for this item.</p>
          )}
        </SectionCard>

        <SectionCard title="Shortage Dates" subtitle="Production lines the planner could not fully fulfill">
          {trace.shortageEvents.length > 0 ? (
            <DataTable
              headers={["Date", "Finished Good", "Shortage Qty"]}
              rows={trace.shortageEvents.map((event) => [
                formatDate(event.date),
                event.sourceFinishedGoodName,
                formatNumber(event.shortageQuantity)
              ])}
            />
          ) : (
            <p className="text-sm text-ink/60">No shortages are projected for this item inside the planning horizon.</p>
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Projected Consumption By Production Line"
        subtitle="Each dated run shows fulfilled demand, shortage, and which lots were consumed"
      >
        <DataTable
          headers={["Date", "Finished Good", "Demand", "Fulfilled", "Shortage", "Lots Used"]}
          rows={trace.projectedConsumption.map((entry) => [
            formatDate(entry.date),
            entry.sourceFinishedGoodName,
            formatNumber(entry.quantity),
            formatNumber(entry.fulfilledQuantity),
            formatNumber(entry.shortageQuantity),
            entry.lotConsumptions.length > 0
              ? entry.lotConsumptions.map((lot) => `${lot.lotCode} ${formatNumber(lot.quantity)}`).join(", ")
              : "None"
          ])}
        />
      </SectionCard>

      {recommendation && metrics ? (
        <SectionCard title="Recommendation Context" subtitle="Cross-check the active recommendation against item metrics">
          <DataTable
            headers={["Recommended Qty", "Order By", "Net Available", "Days Of Cover", "Reason"]}
            rows={[
              [
                formatNumber(recommendation.recommendedQty),
                formatDate(recommendation.orderByDate),
                formatNumber(metrics.netAvailable),
                formatNullableNumber(metrics.daysOfCover, " days"),
                recommendation.reason
              ]
            ]}
          />
        </SectionCard>
      ) : null}
    </>
  );
}
