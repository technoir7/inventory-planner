import { ItemCategory, Prisma, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  SYNTHETIC_INVENTORY_LOTS,
  SYNTHETIC_PRODUCTS,
  SYNTHETIC_PRODUCTION_RUNS,
  SYNTHETIC_PURCHASE_ORDERS
} from "../lib/planning/synthetic-dataset";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

async function main() {
  await prisma.alert.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.productionPlanLine.deleteMany();
  await prisma.productionPlan.deleteMany();
  await prisma.inventoryLot.deleteMany();
  await prisma.bOMLine.deleteMany();
  await prisma.bOM.deleteMany();
  await prisma.supplierItem.deleteMany();
  await prisma.item.deleteMany();
  await prisma.supplier.deleteMany();

  const suppliers = await prisma.$transaction([
    prisma.supplier.create({
      data: {
        name: "Botanical Extracts Co.",
        contact: "procurement@botanicalextracts.example",
        leadTimeDays: 12
      }
    }),
    prisma.supplier.create({
      data: {
        name: "Precision Pack Labs",
        contact: "sales@precisionpack.example",
        leadTimeDays: 18
      }
    })
  ]);

  const supplierByName = Object.fromEntries(suppliers.map((supplier) => [supplier.name, supplier]));

  const items = await prisma.$transaction([
    prisma.item.create({
      data: {
        name: "Retinol",
        category: ItemCategory.RAW_MATERIAL,
        unitOfMeasure: "ml",
        shelfLifeDays: 365,
        defaultSupplierId: supplierByName["Botanical Extracts Co."].id,
        leadTimeDays: 10,
        minimumOrderQuantity: decimal(25),
        orderMultiple: decimal(5),
        costPerUnit: decimal(1.95),
        organicFlag: false,
        safetyStock: decimal(10)
      }
    }),
    prisma.item.create({
      data: {
        name: "Carrier Oil",
        category: ItemCategory.RAW_MATERIAL,
        unitOfMeasure: "ml",
        shelfLifeDays: 540,
        defaultSupplierId: supplierByName["Botanical Extracts Co."].id,
        leadTimeDays: 7,
        minimumOrderQuantity: decimal(250),
        orderMultiple: decimal(50),
        costPerUnit: decimal(0.38),
        organicFlag: true,
        safetyStock: decimal(120)
      }
    }),
    prisma.item.create({
      data: {
        name: "Hyaluronic Acid",
        category: ItemCategory.RAW_MATERIAL,
        unitOfMeasure: "g",
        shelfLifeDays: 730,
        defaultSupplierId: supplierByName["Botanical Extracts Co."].id,
        leadTimeDays: 14,
        minimumOrderQuantity: decimal(10),
        orderMultiple: decimal(5),
        costPerUnit: decimal(6.5),
        organicFlag: false,
        safetyStock: decimal(8)
      }
    }),
    prisma.item.create({
      data: {
        name: "Niacinamide",
        category: ItemCategory.RAW_MATERIAL,
        unitOfMeasure: "g",
        shelfLifeDays: 730,
        defaultSupplierId: supplierByName["Botanical Extracts Co."].id,
        leadTimeDays: 14,
        minimumOrderQuantity: decimal(15),
        orderMultiple: decimal(5),
        costPerUnit: decimal(4.8),
        organicFlag: false,
        safetyStock: decimal(10)
      }
    }),
    prisma.item.create({
      data: {
        name: "Aloe Concentrate",
        category: ItemCategory.RAW_MATERIAL,
        unitOfMeasure: "ml",
        shelfLifeDays: 365,
        defaultSupplierId: supplierByName["Botanical Extracts Co."].id,
        leadTimeDays: 8,
        minimumOrderQuantity: decimal(100),
        orderMultiple: decimal(25),
        costPerUnit: decimal(0.52),
        organicFlag: true,
        safetyStock: decimal(50)
      }
    }),
    prisma.item.create({
      data: {
        name: "Chamomile Extract",
        category: ItemCategory.RAW_MATERIAL,
        unitOfMeasure: "ml",
        shelfLifeDays: 365,
        defaultSupplierId: supplierByName["Botanical Extracts Co."].id,
        leadTimeDays: 9,
        minimumOrderQuantity: decimal(50),
        orderMultiple: decimal(10),
        costPerUnit: decimal(1.1),
        organicFlag: true,
        safetyStock: decimal(25)
      }
    }),
    prisma.item.create({
      data: {
        name: "Shea Butter",
        category: ItemCategory.RAW_MATERIAL,
        unitOfMeasure: "g",
        shelfLifeDays: 540,
        defaultSupplierId: supplierByName["Botanical Extracts Co."].id,
        leadTimeDays: 10,
        minimumOrderQuantity: decimal(50),
        orderMultiple: decimal(10),
        costPerUnit: decimal(0.72),
        organicFlag: true,
        safetyStock: decimal(30)
      }
    }),
    prisma.item.create({
      data: {
        name: "Botanical Powder Blend",
        category: ItemCategory.RAW_MATERIAL,
        unitOfMeasure: "g",
        shelfLifeDays: 365,
        defaultSupplierId: supplierByName["Botanical Extracts Co."].id,
        leadTimeDays: 12,
        minimumOrderQuantity: decimal(30),
        orderMultiple: decimal(10),
        costPerUnit: decimal(2.6),
        organicFlag: true,
        safetyStock: decimal(12)
      }
    }),
    prisma.item.create({
      data: {
        name: "Lavender Essential Oil",
        category: ItemCategory.RAW_MATERIAL,
        unitOfMeasure: "ml",
        shelfLifeDays: 540,
        defaultSupplierId: supplierByName["Botanical Extracts Co."].id,
        leadTimeDays: 7,
        minimumOrderQuantity: decimal(20),
        orderMultiple: decimal(5),
        costPerUnit: decimal(2.2),
        organicFlag: true,
        safetyStock: decimal(10)
      }
    }),
    prisma.item.create({
      data: {
        name: "Preservative Blend",
        category: ItemCategory.RAW_MATERIAL,
        unitOfMeasure: "ml",
        shelfLifeDays: 365,
        defaultSupplierId: supplierByName["Botanical Extracts Co."].id,
        leadTimeDays: 5,
        minimumOrderQuantity: decimal(25),
        orderMultiple: decimal(5),
        costPerUnit: decimal(0.95),
        organicFlag: false,
        safetyStock: decimal(15)
      }
    }),
    prisma.item.create({
      data: {
        name: "Airless Bottle",
        category: ItemCategory.PACKAGING,
        unitOfMeasure: "ea",
        shelfLifeDays: null,
        defaultSupplierId: supplierByName["Precision Pack Labs"].id,
        leadTimeDays: 18,
        minimumOrderQuantity: decimal(250),
        orderMultiple: decimal(50),
        costPerUnit: decimal(0.85),
        organicFlag: false,
        safetyStock: decimal(120)
      }
    }),
    prisma.item.create({
      data: {
        name: "Treatment Pump",
        category: ItemCategory.PACKAGING,
        unitOfMeasure: "ea",
        shelfLifeDays: null,
        defaultSupplierId: supplierByName["Precision Pack Labs"].id,
        leadTimeDays: 18,
        minimumOrderQuantity: decimal(250),
        orderMultiple: decimal(50),
        costPerUnit: decimal(0.24),
        organicFlag: false,
        safetyStock: decimal(120)
      }
    }),
    prisma.item.create({
      data: {
        name: "Folding Carton",
        category: ItemCategory.PACKAGING,
        unitOfMeasure: "ea",
        shelfLifeDays: null,
        defaultSupplierId: supplierByName["Precision Pack Labs"].id,
        leadTimeDays: 21,
        minimumOrderQuantity: decimal(500),
        orderMultiple: decimal(100),
        costPerUnit: decimal(0.18),
        organicFlag: false,
        safetyStock: decimal(180)
      }
    }),
    ...SYNTHETIC_PRODUCTS.map((product) =>
      prisma.item.create({
        data: {
          name: product.name,
          category: ItemCategory.FINISHED_GOOD,
          unitOfMeasure: "ea",
          leadTimeDays: 0,
          minimumOrderQuantity: decimal(0),
          orderMultiple: decimal(1),
          costPerUnit: decimal(0),
          organicFlag: false,
          safetyStock: decimal(0)
        }
      })
    )
  ]);

  const itemByName = Object.fromEntries(items.map((item) => [item.name, item]));

  await prisma.$transaction([
    prisma.supplierItem.createMany({
      data: [
        {
          supplierId: supplierByName["Botanical Extracts Co."].id,
          itemId: itemByName["Retinol"].id,
          unitCost: decimal(1.95),
          minimumOrderQuantity: decimal(25)
        },
        {
          supplierId: supplierByName["Botanical Extracts Co."].id,
          itemId: itemByName["Carrier Oil"].id,
          unitCost: decimal(0.38),
          minimumOrderQuantity: decimal(250)
        },
        {
          supplierId: supplierByName["Precision Pack Labs"].id,
          itemId: itemByName["Airless Bottle"].id,
          unitCost: decimal(0.85),
          minimumOrderQuantity: decimal(250)
        },
        {
          supplierId: supplierByName["Precision Pack Labs"].id,
          itemId: itemByName["Treatment Pump"].id,
          unitCost: decimal(0.24),
          minimumOrderQuantity: decimal(250)
        },
        {
          supplierId: supplierByName["Precision Pack Labs"].id,
          itemId: itemByName["Folding Carton"].id,
          unitCost: decimal(0.18),
          minimumOrderQuantity: decimal(500)
        }
      ]
    }),
    prisma.inventoryLot.createMany({
      data: SYNTHETIC_INVENTORY_LOTS.map((lot) => ({
        itemId: itemByName[lot.itemName].id,
        lotCode: lot.lotCode,
        receivedDate: new Date(lot.receivedDate),
        expirationDate: lot.expirationDate ? new Date(lot.expirationDate) : null,
        quantityAvailable: decimal(lot.quantityAvailable),
        quantityAllocated: decimal(lot.quantityAllocated)
      }))
    })
  ]);

  const bomMetadata: Record<string, { targetPrice: number; fillSizeOz: number; labelDescription: string }> = {
    Product_A: { targetPrice: 48.0, fillSizeOz: 1.0, labelDescription: "Retinol Renewal Serum" },
    Product_B: { targetPrice: 36.0, fillSizeOz: 1.0, labelDescription: "Aloe Chamomile Soothing Serum" },
    Product_C: { targetPrice: 42.0, fillSizeOz: 1.0, labelDescription: "Hyaluronic Brightening Serum" },
    Product_D: { targetPrice: 32.0, fillSizeOz: 2.0, labelDescription: "Shea Botanical Body Balm" },
    Product_E: { targetPrice: 28.0, fillSizeOz: 1.0, labelDescription: "Aloe Lavender Hydrating Mist" }
  };

  await Promise.all(
    SYNTHETIC_PRODUCTS.map((product) =>
      prisma.bOM.create({
        data: {
          finishedGoodItemId: itemByName[product.name].id,
          batchSize: decimal(1),
          yieldPercent: decimal(100),
          targetPrice: bomMetadata[product.name] ? decimal(bomMetadata[product.name].targetPrice) : null,
          fillSizeOz: bomMetadata[product.name] ? decimal(bomMetadata[product.name].fillSizeOz) : null,
          labelDescription: bomMetadata[product.name]?.labelDescription ?? null,
          lines: {
            create: product.lines.map((line) => ({
              componentItemId: itemByName[line.componentItemName].id,
              quantityRequired: decimal(line.quantityRequired)
            }))
          }
        }
      })
    )
  );

  await prisma.productionPlan.create({
    data: {
      startDate: new Date("2026-03-16"),
      endDate: new Date("2026-04-14"),
      lines: {
        create: SYNTHETIC_PRODUCTION_RUNS.map((run) => ({
          finishedGoodItemId: itemByName[run.finishedGoodName].id,
          scheduledDate: new Date(run.scheduledDate),
          quantity: decimal(run.quantity)
        }))
      }
    } as never
  });

  await Promise.all(
    SYNTHETIC_PURCHASE_ORDERS.map((purchaseOrder) =>
      prisma.purchaseOrder.create({
        data: {
          supplierId: supplierByName[purchaseOrder.supplierName].id,
          orderDate: new Date(purchaseOrder.orderDate),
          expectedReceiptDate: new Date(purchaseOrder.expectedReceiptDate),
          status: purchaseOrder.status as PurchaseOrderStatus,
          lines: {
            create: purchaseOrder.lines.map((line) => ({
              itemId: itemByName[line.itemName].id,
              quantity: decimal(line.quantity),
              unitCost: decimal(line.unitCost)
            }))
          }
        }
      })
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
