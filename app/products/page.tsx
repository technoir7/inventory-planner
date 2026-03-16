import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/table";
import { SectionCard } from "@/components/section-card";
import { MetricCard } from "@/components/metric-card";
import { formatNumber } from "@/lib/format";
import { calculateFormulaCost, CostItem } from "@/lib/planning/costs";
import { computeProductMetrics } from "@/lib/product-metrics";

export const dynamic = "force-dynamic";

function num(val: { toNumber(): number } | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return val.toNumber();
}

export default async function ProductsPage() {
  const [boms, items] = await Promise.all([
    prisma.bOM.findMany({
      include: {
        finishedGoodItem: true,
        lines: {
          include: {
            componentItem: true
          }
        }
      },
      orderBy: {
        finishedGoodItem: {
          name: "asc"
        }
      }
    }),
    prisma.item.findMany()
  ]);

  const itemById = new Map<string, CostItem & { organicFlag: boolean }>(
    items.map((item) => [
      item.id,
      { costPerUnit: num(item.costPerUnit), unitOfMeasure: item.unitOfMeasure, organicFlag: item.organicFlag }
    ])
  );

  return (
    <div className="grid gap-6">
      {boms.map((bom) => {
        const bomLines = bom.lines.map((line) => ({
          componentItemId: line.componentItemId,
          quantityRequired: num(line.quantityRequired)
        }));

        const costRollup = calculateFormulaCost(
          {
            batchSize: num(bom.batchSize),
            yieldPercent: num(bom.yieldPercent),
            targetPrice: bom.targetPrice ? num(bom.targetPrice) : null,
            fillSizeOz: bom.fillSizeOz ? num(bom.fillSizeOz) : null,
            lines: bomLines
          },
          itemById
        );

        const metrics = computeProductMetrics({
          bom: bomLines.map((line) => ({
            quantity: line.quantityRequired,
            item: { isOrganic: itemById.get(line.componentItemId)?.organicFlag ?? false }
          }))
        });

        return (
          <SectionCard
            key={bom.id}
            title={bom.labelDescription || bom.finishedGoodItem.name}
            subtitle={`${bom.finishedGoodItem.name} \u00b7 Batch: ${formatNumber(num(bom.batchSize))} ${bom.finishedGoodItem.unitOfMeasure} \u00b7 Yield: ${formatNumber(num(bom.yieldPercent))}%`}
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Formula Cost"
                value={`$${formatNumber(costRollup.costPerUnit, 4)}`}
                detail="Total ingredient cost per unit"
              />
              {costRollup.costPerOz !== null && (
                <MetricCard
                  label="Cost Per Oz"
                  value={`$${formatNumber(costRollup.costPerOz, 4)}`}
                  detail={`Fill size: ${formatNumber(num(bom.fillSizeOz))} oz`}
                />
              )}
              {costRollup.targetPrice !== null && (
                <MetricCard
                  label="Target Price"
                  value={`$${formatNumber(costRollup.targetPrice, 2)}`}
                  detail={`Gross margin: ${costRollup.grossMarginPercent !== null ? formatNumber(costRollup.grossMarginPercent, 1) + "%" : "N/A"}`}
                />
              )}
              {costRollup.grossMargin !== null && (
                <MetricCard
                  label="Gross Margin"
                  value={`$${formatNumber(costRollup.grossMargin, 2)}`}
                  detail="Target price minus formula cost"
                />
              )}
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <MetricCard
                label="Total Volume"
                value={`${formatNumber(metrics.totalVolumeMl)} ml`}
                detail="Sum of all BOM quantities"
              />
              <MetricCard
                label="Yield (1 fl oz)"
                value={formatNumber(metrics.yield1oz, 4)}
                detail="Total volume / 29.5735"
              />
              <MetricCard
                label="Yield 90%"
                value={formatNumber(metrics.yield90, 4)}
                detail="Yield at 90% efficiency"
              />
              <MetricCard
                label="Organic Volume"
                value={`${formatNumber(metrics.organicVolumeMl)} ml`}
                detail="Volume from organic ingredients"
              />
              <MetricCard
                label="% Organic"
                value={`${formatNumber(metrics.organicPercent, 1)}%`}
                detail="Organic share of total volume"
              />
              <MetricCard
                label="Ingredients"
                value={metrics.ingredientCount}
                detail="Number of BOM lines"
              />
            </div>

            <DataTable
              headers={["Ingredient", "Qty", "Unit", "Unit Cost", "Line Cost", "% of Formula"]}
              rows={costRollup.ingredientCosts.map((ic) => {
                const compItem = bom.lines.find((l) => l.componentItemId === ic.componentItemId)?.componentItem;
                return [
                  compItem?.name ?? ic.componentItemId,
                  formatNumber(ic.quantityRequired),
                  ic.unitOfMeasure,
                  `$${formatNumber(ic.costPerUnit, 4)}`,
                  `$${formatNumber(ic.lineCost, 4)}`,
                  `${formatNumber(ic.percentOfFormula, 1)}%`
                ];
              })}
            />
            <div className="mt-2 flex justify-end text-sm font-medium text-ink">
              Total Batch Cost: ${formatNumber(costRollup.totalBatchCost, 4)}
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}
