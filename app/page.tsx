import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { DataTable } from "@/components/table";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { getPlanningSnapshot } from "@/lib/planning/service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getPlanningSnapshot();
  const criticalAlerts = snapshot.alerts.filter((alert) => alert.severity === "CRITICAL" || alert.severity === "HIGH");
  const projectedStockouts = snapshot.inventoryMetrics.filter((item) => item.projectedStockoutDate);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Critical Alerts"
          value={criticalAlerts.length}
          detail="High-priority risks across stock, reorder, and expiry."
        />
        <MetricCard
          label="Recommended Purchases"
          value={snapshot.recommendations.length}
          detail="Active buy recommendations generated from the 30-day plan."
        />
        <MetricCard
          label="Projected Stockouts"
          value={projectedStockouts.length}
          detail="Items expected to run out within current demand assumptions."
        />
        <MetricCard
          label="Expiring Lots"
          value={snapshot.expiringLots.length}
          detail="Inventory lots expiring inside the next 60 days."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Critical Alerts" subtitle="Immediate issues surfaced by the planning engine">
          <DataTable
            headers={["Item", "Type", "Severity", "Message", "Why"]}
            rows={criticalAlerts.slice(0, 8).map((alert) => [
              <Link key={alert.itemId} className="font-medium text-pine underline-offset-4 hover:underline" href={`/items/${alert.itemId}`}>
                {alert.itemName}
              </Link>,
              alert.alertType.replace("_", " "),
              alert.severity,
              alert.message,
              alert.why?.summary ?? "See planning trace for the supporting timeline."
            ])}
          />
        </SectionCard>

        <SectionCard title="Recommended Purchases" subtitle="Net shortages rounded to MOQ and pack multiple">
          <DataTable
            headers={["Item", "Qty", "Order By", "Priority"]}
            rows={snapshot.recommendations.slice(0, 8).map((recommendation) => [
              <Link
                key={recommendation.itemId}
                className="font-medium text-pine underline-offset-4 hover:underline"
                href={`/items/${recommendation.itemId}`}
              >
                {recommendation.itemName}
              </Link>,
              formatNumber(recommendation.recommendedQty),
              formatDate(recommendation.orderByDate),
              recommendation.priorityScore
            ])}
          />
        </SectionCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Projected Stockouts" subtitle="Coverage risk under the active 30-day production plan">
          <DataTable
            headers={["Item", "Net Available", "Days of Cover", "Projected Stockout"]}
            rows={projectedStockouts.slice(0, 8).map((item) => [
              <Link key={item.itemId} className="font-medium text-pine underline-offset-4 hover:underline" href={`/items/${item.itemId}`}>
                {item.itemName}
              </Link>,
              formatNumber(item.netAvailable),
              item.daysOfCover !== null ? formatNumber(item.daysOfCover, 1) : "N/A",
              formatDate(item.projectedStockoutDate)
            ])}
          />
        </SectionCard>

        <SectionCard title="Expiring Inventory" subtitle="Lots expiring inside the 60-day watch window">
          <DataTable
            headers={["Item", "Lot", "Qty", "Expiration"]}
            rows={snapshot.expiringLots.slice(0, 8).map((lot) => [
              <Link key={lot.lotId} className="font-medium text-pine underline-offset-4 hover:underline" href={`/items/${lot.itemId}`}>
                {lot.itemName}
              </Link>,
              lot.lotCode,
              formatNumber(lot.quantityAvailable),
              `${formatDate(lot.expirationDate)} (${lot.daysUntilExpiration}d)`
            ])}
          />
        </SectionCard>
      </section>
    </>
  );
}
