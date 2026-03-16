import Link from "next/link";
import { DataTable } from "@/components/table";
import { SectionCard } from "@/components/section-card";
import { formatNullableNumber, formatNumber } from "@/lib/format";
import { getPlanningSnapshot } from "@/lib/planning/service";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const snapshot = await getPlanningSnapshot();

  return (
    <SectionCard
      title="Inventory Position"
      subtitle="On-hand, allocations, coverage, and reorder signals across materials and packaging"
    >
      <DataTable
        headers={["Item", "On Hand", "Allocated", "Net Available", "Days of Cover", "Reorder Point"]}
        rows={snapshot.inventoryMetrics.map((item) => [
          <Link key={item.itemId} className="font-medium text-pine underline-offset-4 hover:underline" href={`/items/${item.itemId}`}>
            {item.itemName}
          </Link>,
          formatNumber(item.onHand),
          formatNumber(item.allocated),
          formatNumber(item.netAvailable),
          formatNullableNumber(item.daysOfCover, " days"),
          formatNumber(item.reorderPoint)
        ])}
      />
    </SectionCard>
  );
}
