import { describe, it, expect } from "vitest";
import { calculateFormulaCost, CostItem, CostBom } from "@/lib/planning/costs";

function itemMap(entries: Array<[string, CostItem]>): Map<string, CostItem> {
  return new Map(entries);
}

describe("calculateFormulaCost", () => {
  const items = itemMap([
    ["retinol", { costPerUnit: 1.95, unitOfMeasure: "ml" }],
    ["carrier_oil", { costPerUnit: 0.38, unitOfMeasure: "ml" }],
    ["preservative", { costPerUnit: 0.95, unitOfMeasure: "ml" }],
    ["bottle", { costPerUnit: 0.85, unitOfMeasure: "ea" }],
    ["pump", { costPerUnit: 0.24, unitOfMeasure: "ea" }],
    ["carton", { costPerUnit: 0.18, unitOfMeasure: "ea" }]
  ]);

  const productABom: CostBom = {
    batchSize: 1,
    yieldPercent: 100,
    targetPrice: 48.0,
    fillSizeOz: 1.0,
    lines: [
      { componentItemId: "retinol", quantityRequired: 0.5 },
      { componentItemId: "carrier_oil", quantityRequired: 3 },
      { componentItemId: "preservative", quantityRequired: 0.25 },
      { componentItemId: "bottle", quantityRequired: 1 },
      { componentItemId: "pump", quantityRequired: 1 },
      { componentItemId: "carton", quantityRequired: 1 }
    ]
  };

  it("calculates correct total batch cost", () => {
    const result = calculateFormulaCost(productABom, items);
    // 0.5*1.95 + 3*0.38 + 0.25*0.95 + 1*0.85 + 1*0.24 + 1*0.18
    // = 0.975 + 1.14 + 0.2375 + 0.85 + 0.24 + 0.18 = 3.6225
    expect(result.totalBatchCost).toBeCloseTo(3.6225, 4);
  });

  it("calculates correct cost per unit with batch size 1", () => {
    const result = calculateFormulaCost(productABom, items);
    expect(result.costPerUnit).toBeCloseTo(3.6225, 4);
  });

  it("calculates cost per oz using fill size", () => {
    const result = calculateFormulaCost(productABom, items);
    expect(result.costPerOz).toBeCloseTo(3.6225, 4); // 1 oz fill
  });

  it("calculates gross margin from target price", () => {
    const result = calculateFormulaCost(productABom, items);
    expect(result.grossMargin).toBeCloseTo(48 - 3.6225, 4);
    expect(result.grossMarginPercent).toBeCloseTo(((48 - 3.6225) / 48) * 100, 1);
  });

  it("scales cost per unit by batch size", () => {
    const bom: CostBom = {
      ...productABom,
      batchSize: 10
    };
    const result = calculateFormulaCost(bom, items);
    expect(result.totalBatchCost).toBeCloseTo(3.6225, 4);
    expect(result.costPerUnit).toBeCloseTo(3.6225 / 10, 4);
  });

  it("applies yield percent to effective units", () => {
    const bom: CostBom = {
      ...productABom,
      batchSize: 10,
      yieldPercent: 90
    };
    const result = calculateFormulaCost(bom, items);
    // effective units = 10 * 0.9 = 9
    expect(result.effectiveUnitsPerBatch).toBeCloseTo(9, 2);
    expect(result.costPerUnit).toBeCloseTo(3.6225 / 9, 4);
  });

  it("computes ingredient cost contribution percentages", () => {
    const result = calculateFormulaCost(productABom, items);
    const retinol = result.ingredientCosts.find((c) => c.componentItemId === "retinol")!;
    expect(retinol.lineCost).toBeCloseTo(0.975, 4);
    expect(retinol.percentOfFormula).toBeCloseTo((0.975 / 3.6225) * 100, 1);

    const totalPercent = result.ingredientCosts.reduce((sum, c) => sum + c.percentOfFormula, 0);
    expect(totalPercent).toBeCloseTo(100, 0);
  });

  it("returns null for cost per oz when fillSizeOz is null", () => {
    const bom: CostBom = {
      ...productABom,
      fillSizeOz: null
    };
    const result = calculateFormulaCost(bom, items);
    expect(result.costPerOz).toBeNull();
  });

  it("returns null for margin when targetPrice is null", () => {
    const bom: CostBom = {
      ...productABom,
      targetPrice: null
    };
    const result = calculateFormulaCost(bom, items);
    expect(result.grossMargin).toBeNull();
    expect(result.grossMarginPercent).toBeNull();
  });

  it("handles missing items gracefully with zero cost", () => {
    const bom: CostBom = {
      batchSize: 1,
      yieldPercent: 100,
      targetPrice: null,
      fillSizeOz: null,
      lines: [
        { componentItemId: "unknown_item", quantityRequired: 5 }
      ]
    };
    const result = calculateFormulaCost(bom, items);
    expect(result.totalBatchCost).toBe(0);
    expect(result.ingredientCosts[0].lineCost).toBe(0);
  });

  it("handles Product D (Shea Botanical Body Balm) with 2oz fill", () => {
    const productDItems = itemMap([
      ["shea_butter", { costPerUnit: 0.72, unitOfMeasure: "g" }],
      ["chamomile_extract", { costPerUnit: 1.1, unitOfMeasure: "ml" }],
      ["botanical_powder", { costPerUnit: 2.6, unitOfMeasure: "g" }],
      ["bottle", { costPerUnit: 0.85, unitOfMeasure: "ea" }],
      ["pump", { costPerUnit: 0.24, unitOfMeasure: "ea" }],
      ["carton", { costPerUnit: 0.18, unitOfMeasure: "ea" }]
    ]);

    const bom: CostBom = {
      batchSize: 1,
      yieldPercent: 100,
      targetPrice: 32.0,
      fillSizeOz: 2.0,
      lines: [
        { componentItemId: "shea_butter", quantityRequired: 3 },
        { componentItemId: "chamomile_extract", quantityRequired: 0.4 },
        { componentItemId: "botanical_powder", quantityRequired: 0.6 },
        { componentItemId: "bottle", quantityRequired: 1 },
        { componentItemId: "pump", quantityRequired: 1 },
        { componentItemId: "carton", quantityRequired: 1 }
      ]
    };

    const result = calculateFormulaCost(bom, productDItems);
    // 3*0.72 + 0.4*1.1 + 0.6*2.6 + 0.85 + 0.24 + 0.18
    // = 2.16 + 0.44 + 1.56 + 0.85 + 0.24 + 0.18 = 5.43
    expect(result.totalBatchCost).toBeCloseTo(5.43, 2);
    expect(result.costPerOz).toBeCloseTo(5.43 / 2, 2); // 2 oz fill
    expect(result.grossMargin).toBeCloseTo(32 - 5.43, 2);
  });
});
