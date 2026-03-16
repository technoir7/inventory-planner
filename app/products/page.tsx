import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/table";
import { SectionCard } from "@/components/section-card";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const boms = await prisma.bOM.findMany({
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
  });

  return (
    <div className="grid gap-6">
      {boms.map((bom) => (
        <SectionCard
          key={bom.id}
          title={bom.finishedGoodItem.name}
          subtitle={`Batch size ${formatNumber(bom.batchSize.toNumber())} ${bom.finishedGoodItem.unitOfMeasure}`}
        >
          <DataTable
            headers={["Product", "BOM Ingredient", "Usage Quantity"]}
            rows={bom.lines.map((line) => [
              bom.finishedGoodItem.name,
              line.componentItem.name,
              `${formatNumber(line.quantityRequired.toNumber())} ${line.componentItem.unitOfMeasure}`
            ])}
          />
        </SectionCard>
      ))}
    </div>
  );
}
