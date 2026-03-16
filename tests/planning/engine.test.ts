import { describe, expect, it } from "vitest";
import {
  calculateProjectedStockoutDate,
  explodeBomDemand,
  explodeBomDemandByDate,
  roundToOrderingConstraints,
  runPlanningEngine
} from "@/lib/planning/engine";
import { addDays } from "@/lib/dates";
import { PlanningInput, PlanningItem } from "@/lib/planning/types";

function date(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function item(overrides: Partial<PlanningItem> & Pick<PlanningItem, "id" | "name" | "category">): PlanningItem {
  return {
    unitOfMeasure: "ea",
    leadTimeDays: 0,
    minimumOrderQuantity: 0,
    orderMultiple: 1,
    costPerUnit: 0,
    safetyStock: 0,
    ...overrides
  };
}

function buildInput(): PlanningInput {
  return {
    today: date("2026-03-01"),
    planningHorizonDays: 30,
    expirationWindowDays: 60,
    items: [
      item({
        id: "retinol",
        name: "Retinol",
        category: "RAW_MATERIAL",
        unitOfMeasure: "ml",
        leadTimeDays: 7,
        minimumOrderQuantity: 25,
        orderMultiple: 5,
        costPerUnit: 2,
        safetyStock: 8
      }),
      item({
        id: "bottle",
        name: "Airless Bottle",
        category: "PACKAGING",
        leadTimeDays: 4,
        minimumOrderQuantity: 50,
        orderMultiple: 25,
        costPerUnit: 0.8,
        safetyStock: 0
      }),
      item({
        id: "pump",
        name: "Treatment Pump",
        category: "PACKAGING",
        leadTimeDays: 5,
        minimumOrderQuantity: 100,
        orderMultiple: 50,
        costPerUnit: 0.3,
        safetyStock: 20
      }),
      item({
        id: "serum",
        name: "Night Renewal Serum",
        category: "FINISHED_GOOD"
      }),
      item({
        id: "cream",
        name: "Barrier Repair Cream",
        category: "FINISHED_GOOD"
      })
    ],
    boms: [
      {
        finishedGoodItemId: "serum",
        batchSize: 1,
        lines: [
          { componentItemId: "retinol", quantityRequired: 1 },
          { componentItemId: "bottle", quantityRequired: 1 }
        ]
      },
      {
        finishedGoodItemId: "cream",
        batchSize: 1,
        lines: [{ componentItemId: "pump", quantityRequired: 1 }]
      }
    ],
    inventoryLots: [
      {
        id: "ret-a",
        itemId: "retinol",
        lotCode: "RET-A",
        receivedDate: date("2026-02-01"),
        expirationDate: date("2026-03-05"),
        quantityAvailable: 5,
        quantityAllocated: 0
      },
      {
        id: "ret-b",
        itemId: "retinol",
        lotCode: "RET-B",
        receivedDate: date("2026-02-10"),
        expirationDate: date("2026-03-20"),
        quantityAvailable: 10,
        quantityAllocated: 0
      },
      {
        id: "bottle-a",
        itemId: "bottle",
        lotCode: "BOT-A",
        receivedDate: date("2026-02-15"),
        expirationDate: null,
        quantityAvailable: 5,
        quantityAllocated: 0
      },
      {
        id: "pump-a",
        itemId: "pump",
        lotCode: "PUMP-A",
        receivedDate: date("2026-02-15"),
        expirationDate: null,
        quantityAvailable: 12,
        quantityAllocated: 2
      }
    ],
    purchaseOrders: [],
    productionPlans: [
      {
        id: "plan-1",
        startDate: date("2026-03-01"),
        endDate: date("2026-03-30"),
        lines: [
          {
            finishedGoodItemId: "serum",
            quantity: 5,
            scheduledDate: date("2026-03-03")
          },
          {
            finishedGoodItemId: "serum",
            quantity: 5,
            scheduledDate: date("2026-03-12")
          },
          {
            finishedGoodItemId: "cream",
            quantity: 8,
            scheduledDate: date("2026-03-18")
          }
        ]
      }
    ]
  };
}

describe("explodeBomDemand", () => {
  it("aggregates time-phased component demand correctly", () => {
    const demand = explodeBomDemand(buildInput());

    expect(demand).toEqual({
      retinol: 10,
      bottle: 10,
      pump: 8
    });
  });

  it("keeps separate dated demand events for repeated finished good lines", () => {
    const timeline = explodeBomDemandByDate(buildInput());
    expect(timeline.retinol.map((entry) => [entry.date.toISOString().slice(0, 10), entry.quantity])).toEqual([
      ["2026-03-03", 5],
      ["2026-03-12", 5]
    ]);
  });
});

describe("planning helpers", () => {
  it("rounds by MOQ and order multiple", () => {
    const component = item({
      id: "comp",
      name: "Component",
      category: "PACKAGING",
      minimumOrderQuantity: 50,
      orderMultiple: 25
    });

    expect(roundToOrderingConstraints(12, component)).toBe(50);
    expect(roundToOrderingConstraints(61, component)).toBe(75);
  });

  it("projects stockout dates using receipts", () => {
    const today = date("2026-03-01");
    expect(calculateProjectedStockoutDate(today, 2, 10, [{ date: addDays(today, 3), quantity: 4 }])).toEqual(
      addDays(today, 7)
    );
  });
});

describe("runPlanningEngine", () => {
  it("detects a shortage by required date even when total inventory is sufficient later", () => {
    const input = buildInput();
    input.productionPlans[0].lines = [
      {
        finishedGoodItemId: "serum",
        quantity: 10,
        scheduledDate: date("2026-03-03")
      },
      {
        finishedGoodItemId: "serum",
        quantity: 10,
        scheduledDate: date("2026-03-12")
      }
    ];
    input.purchaseOrders = [
      {
        id: "po-bottle",
        expectedReceiptDate: date("2026-03-10"),
        status: "OPEN",
        lines: [{ itemId: "bottle", quantity: 20 }]
      }
    ];

    const result = runPlanningEngine(input);
    const bottle = result.inventoryMetrics.find((entry) => entry.itemId === "bottle");
    const bottleRecommendation = result.recommendations.find((entry) => entry.itemId === "bottle");

    expect(bottle).toMatchObject({
      netAvailable: 25,
      shortageQuantity: 5,
      blockedUntilReceipt: true
    });
    expect(bottle?.firstShortageDate?.toISOString().slice(0, 10)).toBe("2026-03-03");
    expect(bottleRecommendation).toMatchObject({
      recommendedQty: 50
    });
    expect(bottleRecommendation?.reason).toContain("arrives too late");
    expect(bottleRecommendation?.explanation).toMatchObject({
      currentUsableInventory: 5,
      reorderPoint: 10,
      safetyStock: 0,
      demandDuringLeadTime: 10,
      projectedInventoryAtReceipt: 0,
      expiryRiskInfluenced: false
    });
    expect(bottleRecommendation?.explanation.inboundInventory).toMatchObject([
      {
        referenceId: "po-bottle",
        sourceType: "PURCHASE_ORDER",
        quantity: 20
      }
    ]);
    expect(
      bottleRecommendation?.explanation.datedDemand.map((entry) => ({
        date: entry.date.toISOString().slice(0, 10),
        quantity: entry.quantity,
        shortageQuantity: entry.shortageQuantity
      }))
    ).toEqual([
      { date: "2026-03-03", quantity: 10, shortageQuantity: 5 },
      { date: "2026-03-12", quantity: 10, shortageQuantity: 0 }
    ]);
    expect(bottleRecommendation?.explanation.orderingAdjustment).toMatchObject({
      rawRequiredQty: 20,
      roundedQty: 50,
      minimumOrderQuantity: 50,
      orderMultiple: 25,
      moqApplied: true,
      orderMultipleApplied: false
    });
  });

  it("consumes multiple lots in FEFO order and fully uses an early-expiring lot", () => {
    const result = runPlanningEngine(buildInput());
    const retinolRisk = result.expiringLots.find((entry) => entry.lotId === "ret-a");

    expect(retinolRisk).toMatchObject({
      projectedConsumptionBeforeExpiration: 5,
      projectedWasteQuantity: 0,
      fullyConsumedBeforeExpiration: true
    });
  });

  it("projects expiry waste when an early-expiring lot is only partially consumed", () => {
    const input = buildInput();
    input.productionPlans[0].lines = [
      {
        finishedGoodItemId: "serum",
        quantity: 4,
        scheduledDate: date("2026-03-04")
      },
      {
        finishedGoodItemId: "serum",
        quantity: 10,
        scheduledDate: date("2026-03-12")
      }
    ];

    const result = runPlanningEngine(input);
    const retinolRisk = result.expiringLots.find((entry) => entry.lotId === "ret-a");

    expect(retinolRisk).toMatchObject({
      projectedConsumptionBeforeExpiration: 4,
      projectedWasteQuantity: 1,
      fullyConsumedBeforeExpiration: false
    });
    expect(
      result.alerts.some(
        (alert) => alert.itemId === "retinol" && alert.alertType === "EXPIRING_LOT" && alert.severity === "HIGH"
      )
    ).toBe(true);
  });

  it("handles an inbound PO that arrives after one production line but before another", () => {
    const input = buildInput();
    input.productionPlans[0].lines = [
      {
        finishedGoodItemId: "serum",
        quantity: 10,
        scheduledDate: date("2026-03-03")
      },
      {
        finishedGoodItemId: "serum",
        quantity: 10,
        scheduledDate: date("2026-03-12")
      }
    ];
    input.inventoryLots = [
      {
        id: "bottle-a",
        itemId: "bottle",
        lotCode: "BOT-A",
        receivedDate: date("2026-02-15"),
        expirationDate: null,
        quantityAvailable: 5,
        quantityAllocated: 0
      }
    ];
    input.purchaseOrders = [
      {
        id: "po-bottle",
        expectedReceiptDate: date("2026-03-08"),
        status: "OPEN",
        lines: [{ itemId: "bottle", quantity: 10 }]
      }
    ];

    const result = runPlanningEngine(input);
    const bottle = result.inventoryMetrics.find((entry) => entry.itemId === "bottle");

    expect(bottle).toMatchObject({
      netAvailable: 15,
      shortageQuantity: 5,
      blockedUntilReceipt: true
    });
    expect(bottle?.firstShortageDate?.toISOString().slice(0, 10)).toBe("2026-03-03");
  });

  it("can recommend purchases for raw material and packaging shortages tied to different finished SKUs", () => {
    const input = buildInput();
    input.inventoryLots = [
      {
        id: "ret-a",
        itemId: "retinol",
        lotCode: "RET-A",
        receivedDate: date("2026-02-01"),
        expirationDate: date("2026-03-05"),
        quantityAvailable: 2,
        quantityAllocated: 0
      },
      {
        id: "pump-a",
        itemId: "pump",
        lotCode: "PUMP-A",
        receivedDate: date("2026-02-15"),
        expirationDate: null,
        quantityAvailable: 1,
        quantityAllocated: 0
      }
    ];

    const result = runPlanningEngine(input);
    expect(result.recommendations.some((entry) => entry.itemId === "retinol")).toBe(true);
    expect(result.recommendations.some((entry) => entry.itemId === "pump")).toBe(true);
  });

  it("tracks partial allocations separately from on-hand and net availability", () => {
    const result = runPlanningEngine(buildInput());
    const pump = result.inventoryMetrics.find((entry) => entry.itemId === "pump");

    expect(pump).toMatchObject({
      onHand: 12,
      allocated: 2,
      netAvailable: 10
    });
  });

  it("keeps item traces and blocked alert explanations aligned with planner output", () => {
    const input = buildInput();
    input.productionPlans[0].lines = [
      {
        finishedGoodItemId: "serum",
        quantity: 10,
        scheduledDate: date("2026-03-03")
      },
      {
        finishedGoodItemId: "serum",
        quantity: 10,
        scheduledDate: date("2026-03-12")
      }
    ];
    input.purchaseOrders = [
      {
        id: "po-bottle",
        expectedReceiptDate: date("2026-03-10"),
        status: "OPEN",
        lines: [{ itemId: "bottle", quantity: 20 }]
      }
    ];

    const result = runPlanningEngine(input);
    const bottleTrace = result.itemTraces.bottle;
    const bottleAlert = result.alerts.find((entry) => entry.itemId === "bottle" && entry.alertType === "STOCKOUT_RISK");

    expect(bottleTrace.currentUsableInventory).toBe(5);
    expect(
      bottleTrace.shortageEvents.map((event) => ({
        date: event.date.toISOString().slice(0, 10),
        sourceFinishedGoodItemId: event.sourceFinishedGoodItemId,
        sourceFinishedGoodName: event.sourceFinishedGoodName,
        shortageQuantity: event.shortageQuantity
      }))
    ).toEqual([
      {
        date: "2026-03-03",
        sourceFinishedGoodItemId: "serum",
        sourceFinishedGoodName: "Night Renewal Serum",
        shortageQuantity: 5
      }
    ]);
    expect(bottleTrace.projectedConsumption[1]).toMatchObject({
      sourceFinishedGoodName: "Night Renewal Serum",
      fulfilledQuantity: 10,
      shortageQuantity: 0
    });
    expect(bottleTrace.inboundInventory).toMatchObject([
      {
        referenceLabel: "PO po-bottle",
        quantity: 20
      }
    ]);
    expect(bottleAlert?.why).toMatchObject({
      currentUsableInventory: 5,
      shortageQuantity: 5
    });
    expect(bottleAlert?.why?.datedDemand.map((entry) => entry.date.toISOString().slice(0, 10))).toEqual(["2026-03-03"]);
  });

  it("returns no recommendation for zero demand when safety stock is zero", () => {
    const input = buildInput();
    input.items = [
      item({
        id: "powder",
        name: "Botanical Powder",
        category: "RAW_MATERIAL",
        unitOfMeasure: "g",
        leadTimeDays: 5,
        minimumOrderQuantity: 10,
        orderMultiple: 5
      })
    ];
    input.boms = [];
    input.inventoryLots = [
      {
        id: "pow-1",
        itemId: "powder",
        lotCode: "POW-1",
        receivedDate: date("2026-02-20"),
        expirationDate: null,
        quantityAvailable: 3,
        quantityAllocated: 0
      }
    ];
    input.purchaseOrders = [];
    input.productionPlans = [];

    const result = runPlanningEngine(input);
    expect(result.recommendations).toEqual([]);
    expect(result.inventoryMetrics[0]).toMatchObject({
      demandDuringLeadTime: 0,
      reorderPoint: 0,
      daysOfCover: null
    });
  });

  it("raises an explicit failure for missing unit-of-measure data", () => {
    const input = buildInput();
    input.items[0].unitOfMeasure = " ";

    expect(() => runPlanningEngine(input)).toThrow('Item "Retinol" is missing a unit of measure.');
  });
});
