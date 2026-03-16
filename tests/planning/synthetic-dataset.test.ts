import { describe, expect, it } from "vitest";
import { explodeBomDemandByDate, runPlanningEngine } from "@/lib/planning/engine";
import {
  buildSyntheticPlanningInput,
  SYNTHETIC_DATASET_NOTES,
  SYNTHETIC_PRODUCTS,
  SYNTHETIC_PRODUCTION_RUNS
} from "@/lib/planning/synthetic-dataset";

describe("synthetic planning dataset", () => {
  it("defines a clearly fake finished-goods catalog with split dated runs", () => {
    expect(SYNTHETIC_PRODUCTS.map((product) => product.name)).toEqual([
      "Product_A",
      "Product_B",
      "Product_C",
      "Product_D",
      "Product_E"
    ]);
    expect(SYNTHETIC_PRODUCTION_RUNS.filter((run) => run.finishedGoodName === "Product_A")).toHaveLength(2);
    expect(SYNTHETIC_DATASET_NOTES.length).toBeGreaterThanOrEqual(4);
  });

  it("creates dated shared-demand events for retinol across Product_A and Product_B", () => {
    const timeline = explodeBomDemandByDate(buildSyntheticPlanningInput());
    const retinolTimeline = timeline.retinol.map((entry) => ({
      date: entry.date.toISOString().slice(0, 10),
      quantity: entry.quantity
    }));

    expect(retinolTimeline).toEqual([
      { date: "2026-03-18", quantity: 15 },
      { date: "2026-03-20", quantity: 10 },
      { date: "2026-04-02", quantity: 17.5 },
      { date: "2026-04-09", quantity: 10 }
    ]);
  });

  it("detects both raw-material and packaging bottlenecks with blocked production", () => {
    const result = runPlanningEngine(buildSyntheticPlanningInput());
    const retinol = result.inventoryMetrics.find((entry) => entry.itemName === "Retinol");
    const carton = result.inventoryMetrics.find((entry) => entry.itemName === "Folding Carton");

    expect(retinol).toMatchObject({
      blockedUntilReceipt: true
    });
    expect(retinol?.firstShortageDate?.toISOString().slice(0, 10)).toBe("2026-03-20");

    expect(carton).toMatchObject({
      netAvailable: 290,
      shortageQuantity: 30,
      blockedUntilReceipt: true
    });
    expect(carton?.firstShortageDate?.toISOString().slice(0, 10)).toBe("2026-03-24");
  });

  it("projects FEFO full consumption for chamomile and partial waste for botanical powder", () => {
    const result = runPlanningEngine(buildSyntheticPlanningInput());
    const chamomileLot = result.expiringLots.find((entry) => entry.lotCode === "CHA-SYN-A");
    const powderLot = result.expiringLots.find((entry) => entry.lotCode === "BOT-SYN-A");
    const chamomileTrace = result.itemTraces.chamomile_extract;
    const powderTrace = result.itemTraces.botanical_powder_blend;

    expect(chamomileLot).toMatchObject({
      projectedConsumptionBeforeExpiration: 18,
      projectedWasteQuantity: 0,
      fullyConsumedBeforeExpiration: true
    });
    expect(powderLot).toMatchObject({
      projectedConsumptionBeforeExpiration: 6,
      projectedWasteQuantity: 6,
      fullyConsumedBeforeExpiration: false
    });
    expect(chamomileTrace.lotsInFefoOrder.slice(0, 2).map((lot) => lot.lotCode)).toEqual(["CHA-SYN-A", "CHA-SYN-B"]);
    expect(chamomileTrace.projectedConsumption[0].lotConsumptions[0]).toMatchObject({
      lotCode: "CHA-SYN-A"
    });
    expect(powderTrace.projectedExpiryWaste).toBe(6);
  });

  it("generates recommendations for both the retinol bottleneck and carton rounding pressure", () => {
    const result = runPlanningEngine(buildSyntheticPlanningInput());
    const retinolRecommendation = result.recommendations.find((entry) => entry.itemName === "Retinol");
    const cartonRecommendation = result.recommendations.find((entry) => entry.itemName === "Folding Carton");

    expect(retinolRecommendation?.recommendedQty).toBe(65);
    expect(cartonRecommendation?.recommendedQty).toBeGreaterThanOrEqual(500);
    expect((cartonRecommendation?.recommendedQty ?? 0) % 100).toBe(0);
  });
});
