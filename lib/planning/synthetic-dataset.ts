import { PlanningInput, PlanningItem } from "@/lib/planning/types";

type SyntheticComponentLine = {
  componentItemName: string;
  quantityRequired: number;
};

type SyntheticProductDefinition = {
  name: string;
  lines: SyntheticComponentLine[];
};

type SyntheticProductionRun = {
  finishedGoodName: string;
  scheduledDate: string;
  quantity: number;
};

type SyntheticInventoryLot = {
  itemName: string;
  lotCode: string;
  receivedDate: string;
  expirationDate: string | null;
  quantityAvailable: number;
  quantityAllocated: number;
};

type SyntheticPurchaseOrder = {
  supplierName: string;
  orderDate: string;
  expectedReceiptDate: string;
  status: "OPEN" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
  lines: Array<{
    itemName: string;
    quantity: number;
    unitCost: number;
  }>;
};

const COMPONENT_ITEMS: PlanningItem[] = [
  {
    id: "retinol",
    name: "Retinol",
    category: "RAW_MATERIAL",
    unitOfMeasure: "ml",
    leadTimeDays: 10,
    minimumOrderQuantity: 25,
    orderMultiple: 5,
    costPerUnit: 1.95,
    safetyStock: 10
  },
  {
    id: "carrier_oil",
    name: "Carrier Oil",
    category: "RAW_MATERIAL",
    unitOfMeasure: "ml",
    leadTimeDays: 7,
    minimumOrderQuantity: 250,
    orderMultiple: 50,
    costPerUnit: 0.38,
    safetyStock: 120
  },
  {
    id: "hyaluronic_acid",
    name: "Hyaluronic Acid",
    category: "RAW_MATERIAL",
    unitOfMeasure: "g",
    leadTimeDays: 14,
    minimumOrderQuantity: 10,
    orderMultiple: 5,
    costPerUnit: 6.5,
    safetyStock: 8
  },
  {
    id: "niacinamide",
    name: "Niacinamide",
    category: "RAW_MATERIAL",
    unitOfMeasure: "g",
    leadTimeDays: 14,
    minimumOrderQuantity: 15,
    orderMultiple: 5,
    costPerUnit: 4.8,
    safetyStock: 10
  },
  {
    id: "aloe_concentrate",
    name: "Aloe Concentrate",
    category: "RAW_MATERIAL",
    unitOfMeasure: "ml",
    leadTimeDays: 8,
    minimumOrderQuantity: 100,
    orderMultiple: 25,
    costPerUnit: 0.52,
    safetyStock: 50
  },
  {
    id: "chamomile_extract",
    name: "Chamomile Extract",
    category: "RAW_MATERIAL",
    unitOfMeasure: "ml",
    leadTimeDays: 9,
    minimumOrderQuantity: 50,
    orderMultiple: 10,
    costPerUnit: 1.1,
    safetyStock: 25
  },
  {
    id: "shea_butter",
    name: "Shea Butter",
    category: "RAW_MATERIAL",
    unitOfMeasure: "g",
    leadTimeDays: 10,
    minimumOrderQuantity: 50,
    orderMultiple: 10,
    costPerUnit: 0.72,
    safetyStock: 30
  },
  {
    id: "botanical_powder_blend",
    name: "Botanical Powder Blend",
    category: "RAW_MATERIAL",
    unitOfMeasure: "g",
    leadTimeDays: 12,
    minimumOrderQuantity: 30,
    orderMultiple: 10,
    costPerUnit: 2.6,
    safetyStock: 12
  },
  {
    id: "lavender_essential_oil",
    name: "Lavender Essential Oil",
    category: "RAW_MATERIAL",
    unitOfMeasure: "ml",
    leadTimeDays: 7,
    minimumOrderQuantity: 20,
    orderMultiple: 5,
    costPerUnit: 2.2,
    safetyStock: 10
  },
  {
    id: "preservative_blend",
    name: "Preservative Blend",
    category: "RAW_MATERIAL",
    unitOfMeasure: "ml",
    leadTimeDays: 5,
    minimumOrderQuantity: 25,
    orderMultiple: 5,
    costPerUnit: 0.95,
    safetyStock: 15
  },
  {
    id: "airless_bottle",
    name: "Airless Bottle",
    category: "PACKAGING",
    unitOfMeasure: "ea",
    leadTimeDays: 18,
    minimumOrderQuantity: 250,
    orderMultiple: 50,
    costPerUnit: 0.85,
    safetyStock: 120
  },
  {
    id: "treatment_pump",
    name: "Treatment Pump",
    category: "PACKAGING",
    unitOfMeasure: "ea",
    leadTimeDays: 18,
    minimumOrderQuantity: 250,
    orderMultiple: 50,
    costPerUnit: 0.24,
    safetyStock: 120
  },
  {
    id: "folding_carton",
    name: "Folding Carton",
    category: "PACKAGING",
    unitOfMeasure: "ea",
    leadTimeDays: 21,
    minimumOrderQuantity: 500,
    orderMultiple: 100,
    costPerUnit: 0.18,
    safetyStock: 180
  }
];

export const SYNTHETIC_PRODUCTS: SyntheticProductDefinition[] = [
  {
    name: "Product_A",
    lines: [
      { componentItemName: "Retinol", quantityRequired: 0.5 },
      { componentItemName: "Carrier Oil", quantityRequired: 3 },
      { componentItemName: "Preservative Blend", quantityRequired: 0.25 },
      { componentItemName: "Airless Bottle", quantityRequired: 1 },
      { componentItemName: "Treatment Pump", quantityRequired: 1 },
      { componentItemName: "Folding Carton", quantityRequired: 1 }
    ]
  },
  {
    name: "Product_B",
    lines: [
      { componentItemName: "Retinol", quantityRequired: 0.4 },
      { componentItemName: "Aloe Concentrate", quantityRequired: 4 },
      { componentItemName: "Chamomile Extract", quantityRequired: 0.6 },
      { componentItemName: "Preservative Blend", quantityRequired: 0.2 },
      { componentItemName: "Airless Bottle", quantityRequired: 1 },
      { componentItemName: "Treatment Pump", quantityRequired: 1 },
      { componentItemName: "Folding Carton", quantityRequired: 1 }
    ]
  },
  {
    name: "Product_C",
    lines: [
      { componentItemName: "Hyaluronic Acid", quantityRequired: 0.4 },
      { componentItemName: "Niacinamide", quantityRequired: 0.8 },
      { componentItemName: "Carrier Oil", quantityRequired: 1.5 },
      { componentItemName: "Airless Bottle", quantityRequired: 1 },
      { componentItemName: "Treatment Pump", quantityRequired: 1 },
      { componentItemName: "Folding Carton", quantityRequired: 1 }
    ]
  },
  {
    name: "Product_D",
    lines: [
      { componentItemName: "Shea Butter", quantityRequired: 3 },
      { componentItemName: "Chamomile Extract", quantityRequired: 0.4 },
      { componentItemName: "Botanical Powder Blend", quantityRequired: 0.6 },
      { componentItemName: "Airless Bottle", quantityRequired: 1 },
      { componentItemName: "Treatment Pump", quantityRequired: 1 },
      { componentItemName: "Folding Carton", quantityRequired: 1 }
    ]
  },
  {
    name: "Product_E",
    lines: [
      { componentItemName: "Aloe Concentrate", quantityRequired: 3 },
      { componentItemName: "Lavender Essential Oil", quantityRequired: 0.1 },
      { componentItemName: "Preservative Blend", quantityRequired: 0.2 },
      { componentItemName: "Airless Bottle", quantityRequired: 1 },
      { componentItemName: "Treatment Pump", quantityRequired: 1 },
      { componentItemName: "Folding Carton", quantityRequired: 1 }
    ]
  }
];

export const SYNTHETIC_PRODUCTION_RUNS: SyntheticProductionRun[] = [
  { finishedGoodName: "Product_A", scheduledDate: "2026-03-18", quantity: 30 },
  { finishedGoodName: "Product_B", scheduledDate: "2026-03-20", quantity: 25 },
  { finishedGoodName: "Product_D", scheduledDate: "2026-03-22", quantity: 10 },
  { finishedGoodName: "Product_C", scheduledDate: "2026-03-24", quantity: 35 },
  { finishedGoodName: "Product_D", scheduledDate: "2026-03-28", quantity: 20 },
  { finishedGoodName: "Product_A", scheduledDate: "2026-04-02", quantity: 35 },
  { finishedGoodName: "Product_E", scheduledDate: "2026-04-05", quantity: 30 },
  { finishedGoodName: "Product_B", scheduledDate: "2026-04-09", quantity: 25 },
  { finishedGoodName: "Product_C", scheduledDate: "2026-04-12", quantity: 30 }
];

export const SYNTHETIC_INVENTORY_LOTS: SyntheticInventoryLot[] = [
  {
    itemName: "Retinol",
    lotCode: "RET-SYN-A",
    receivedDate: "2026-02-01",
    expirationDate: "2026-03-26",
    quantityAvailable: 8,
    quantityAllocated: 0
  },
  {
    itemName: "Retinol",
    lotCode: "RET-SYN-B",
    receivedDate: "2026-02-20",
    expirationDate: "2026-04-20",
    quantityAvailable: 12,
    quantityAllocated: 0
  },
  {
    itemName: "Carrier Oil",
    lotCode: "CAR-SYN-A",
    receivedDate: "2026-02-01",
    expirationDate: "2027-04-01",
    quantityAvailable: 600,
    quantityAllocated: 40
  },
  {
    itemName: "Hyaluronic Acid",
    lotCode: "HYA-SYN-A",
    receivedDate: "2026-02-15",
    expirationDate: "2027-12-31",
    quantityAvailable: 40,
    quantityAllocated: 0
  },
  {
    itemName: "Niacinamide",
    lotCode: "NIA-SYN-A",
    receivedDate: "2026-02-18",
    expirationDate: "2027-12-31",
    quantityAvailable: 28,
    quantityAllocated: 0
  },
  {
    itemName: "Aloe Concentrate",
    lotCode: "ALO-SYN-A",
    receivedDate: "2026-02-10",
    expirationDate: "2026-08-10",
    quantityAvailable: 240,
    quantityAllocated: 10
  },
  {
    itemName: "Chamomile Extract",
    lotCode: "CHA-SYN-A",
    receivedDate: "2026-02-12",
    expirationDate: "2026-03-24",
    quantityAvailable: 18,
    quantityAllocated: 0
  },
  {
    itemName: "Chamomile Extract",
    lotCode: "CHA-SYN-B",
    receivedDate: "2026-02-25",
    expirationDate: "2026-05-05",
    quantityAvailable: 24,
    quantityAllocated: 0
  },
  {
    itemName: "Shea Butter",
    lotCode: "SHE-SYN-A",
    receivedDate: "2026-02-04",
    expirationDate: "2027-01-31",
    quantityAvailable: 120,
    quantityAllocated: 20
  },
  {
    itemName: "Botanical Powder Blend",
    lotCode: "BOT-SYN-A",
    receivedDate: "2026-02-15",
    expirationDate: "2026-03-24",
    quantityAvailable: 12,
    quantityAllocated: 0
  },
  {
    itemName: "Botanical Powder Blend",
    lotCode: "BOT-SYN-B",
    receivedDate: "2026-02-28",
    expirationDate: "2026-09-01",
    quantityAvailable: 23,
    quantityAllocated: 0
  },
  {
    itemName: "Lavender Essential Oil",
    lotCode: "LAV-SYN-A",
    receivedDate: "2026-02-11",
    expirationDate: "2026-11-15",
    quantityAvailable: 24,
    quantityAllocated: 3
  },
  {
    itemName: "Preservative Blend",
    lotCode: "PRE-SYN-A",
    receivedDate: "2026-02-20",
    expirationDate: "2026-10-20",
    quantityAvailable: 70,
    quantityAllocated: 5
  },
  {
    itemName: "Airless Bottle",
    lotCode: "BOTL-SYN-A",
    receivedDate: "2026-02-12",
    expirationDate: null,
    quantityAvailable: 180,
    quantityAllocated: 20
  },
  {
    itemName: "Treatment Pump",
    lotCode: "PUMP-SYN-A",
    receivedDate: "2026-02-12",
    expirationDate: null,
    quantityAvailable: 160,
    quantityAllocated: 10
  },
  {
    itemName: "Folding Carton",
    lotCode: "CART-SYN-A",
    receivedDate: "2026-02-12",
    expirationDate: null,
    quantityAvailable: 90,
    quantityAllocated: 0
  }
];

export const SYNTHETIC_PURCHASE_ORDERS: SyntheticPurchaseOrder[] = [
  {
    supplierName: "Precision Pack Labs",
    orderDate: "2026-03-10",
    expectedReceiptDate: "2026-03-28",
    status: "OPEN",
    lines: [
      { itemName: "Airless Bottle", quantity: 250, unitCost: 0.85 },
      { itemName: "Treatment Pump", quantity: 250, unitCost: 0.24 }
    ]
  },
  {
    supplierName: "Precision Pack Labs",
    orderDate: "2026-03-12",
    expectedReceiptDate: "2026-04-01",
    status: "OPEN",
    lines: [{ itemName: "Folding Carton", quantity: 200, unitCost: 0.18 }]
  },
  {
    supplierName: "Botanical Extracts Co.",
    orderDate: "2026-03-09",
    expectedReceiptDate: "2026-04-04",
    status: "OPEN",
    lines: [{ itemName: "Retinol", quantity: 25, unitCost: 1.95 }]
  }
];

export const SYNTHETIC_DATASET_NOTES = [
  "Product_A and Product_B share Retinol to create a low-stock raw-material bottleneck.",
  "All synthetic products consume Folding Carton, with a late inbound PO on April 1, 2026 that rescues later runs but not earlier ones.",
  "Chamomile Extract is split across two FEFO lots; the earlier lot is fully consumed before expiry.",
  "Botanical Powder Blend includes an early-expiring lot that is only partially consumed, generating projected expiry waste.",
  "Carton MOQ 500 and order multiple 100 create deliberate overbuy pressure in recommendations."
] as const;

function syntheticDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export function buildSyntheticPlanningInput(): PlanningInput {
  const items = [
    ...COMPONENT_ITEMS,
    ...SYNTHETIC_PRODUCTS.map((product, index) => ({
      id: `product_${index + 1}`,
      name: product.name,
      category: "FINISHED_GOOD" as const,
      unitOfMeasure: "ea",
      leadTimeDays: 0,
      minimumOrderQuantity: 0,
      orderMultiple: 1,
      costPerUnit: 0,
      safetyStock: 0
    }))
  ];

  const itemByName = new Map(items.map((entry) => [entry.name, entry]));

  return {
    today: syntheticDate("2026-03-16"),
    planningHorizonDays: 30,
    expirationWindowDays: 60,
    items,
    boms: SYNTHETIC_PRODUCTS.map((product) => ({
      finishedGoodItemId: itemByName.get(product.name)!.id,
      batchSize: 1,
      lines: product.lines.map((line) => ({
        componentItemId: itemByName.get(line.componentItemName)!.id,
        quantityRequired: line.quantityRequired
      }))
    })),
    inventoryLots: SYNTHETIC_INVENTORY_LOTS.map((lot, index) => ({
      id: `synthetic_lot_${index + 1}`,
      itemId: itemByName.get(lot.itemName)!.id,
      lotCode: lot.lotCode,
      receivedDate: syntheticDate(lot.receivedDate),
      expirationDate: lot.expirationDate ? syntheticDate(lot.expirationDate) : null,
      quantityAvailable: lot.quantityAvailable,
      quantityAllocated: lot.quantityAllocated
    })),
    purchaseOrders: SYNTHETIC_PURCHASE_ORDERS.map((purchaseOrder, index) => ({
      id: `synthetic_po_${index + 1}`,
      expectedReceiptDate: syntheticDate(purchaseOrder.expectedReceiptDate),
      status: purchaseOrder.status,
      lines: purchaseOrder.lines.map((line) => ({
        itemId: itemByName.get(line.itemName)!.id,
        quantity: line.quantity
      }))
    })),
    productionPlans: [
      {
        id: "synthetic_plan_1",
        startDate: syntheticDate("2026-03-16"),
        endDate: syntheticDate("2026-04-14"),
        lines: SYNTHETIC_PRODUCTION_RUNS.map((run) => ({
          finishedGoodItemId: itemByName.get(run.finishedGoodName)!.id,
          quantity: run.quantity,
          scheduledDate: syntheticDate(run.scheduledDate)
        }))
      }
    ]
  };
}
