import { ItemCategory, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runPlanningEngine } from "@/lib/planning/engine";

function decimalToNumber(value: { toNumber(): number } | null | undefined) {
  return value ? value.toNumber() : 0;
}

export async function getPlanningSnapshot(today = new Date()) {
  const [items, boms, inventoryLots, purchaseOrders, productionPlans] = await Promise.all([
    prisma.item.findMany({
      include: {
        defaultSupplier: true
      }
    }),
    prisma.bOM.findMany({
      include: {
        lines: true
      }
    }),
    prisma.inventoryLot.findMany(),
    prisma.purchaseOrder.findMany({
      where: {
        status: {
          in: [PurchaseOrderStatus.OPEN, PurchaseOrderStatus.PARTIALLY_RECEIVED]
        }
      },
      include: {
        lines: true
      }
    }),
    prisma.productionPlan.findMany({
      include: {
        lines: true
      }
    })
  ]);

  return runPlanningEngine({
    today,
    planningHorizonDays: 30,
    expirationWindowDays: 60,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category as ItemCategory,
      unitOfMeasure: item.unitOfMeasure,
      leadTimeDays: item.leadTimeDays,
      minimumOrderQuantity: decimalToNumber(item.minimumOrderQuantity),
      orderMultiple: decimalToNumber(item.orderMultiple),
      costPerUnit: decimalToNumber(item.costPerUnit),
      safetyStock: decimalToNumber(item.safetyStock)
    })),
    boms: boms.map((bom) => ({
      finishedGoodItemId: bom.finishedGoodItemId,
      batchSize: decimalToNumber(bom.batchSize),
      lines: bom.lines.map((line) => ({
        componentItemId: line.componentItemId,
        quantityRequired: decimalToNumber(line.quantityRequired)
      }))
    })),
    inventoryLots: inventoryLots.map((lot) => ({
      id: lot.id,
      itemId: lot.itemId,
      lotCode: lot.lotCode,
      receivedDate: lot.receivedDate,
      expirationDate: lot.expirationDate,
      quantityAvailable: decimalToNumber(lot.quantityAvailable),
      quantityAllocated: decimalToNumber(lot.quantityAllocated)
    })),
    purchaseOrders: purchaseOrders.map((purchaseOrder) => ({
      id: purchaseOrder.id,
      expectedReceiptDate: purchaseOrder.expectedReceiptDate,
      status: purchaseOrder.status as PurchaseOrderStatus,
      lines: purchaseOrder.lines.map((line) => ({
        itemId: line.itemId,
        quantity: decimalToNumber(line.quantity)
      }))
    })),
    productionPlans: productionPlans.map((plan) => ({
      id: plan.id,
      startDate: plan.startDate,
      endDate: plan.endDate,
      lines: plan.lines.map((line) => ({
        finishedGoodItemId: line.finishedGoodItemId,
        quantity: decimalToNumber(line.quantity),
        scheduledDate: (line as { scheduledDate?: Date | null }).scheduledDate ?? null
      }))
    }))
  });
}
