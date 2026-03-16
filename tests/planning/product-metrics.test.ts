import { describe, it, expect } from "vitest";
import { computeProductMetrics } from "@/lib/product-metrics";

describe("computeProductMetrics", () => {
  // Product_A: Retinol 0.5ml, Carrier Oil 3ml (organic), Preservative 0.25ml,
  //            Bottle 1ea, Pump 1ea, Carton 1ea
  const productA = {
    bom: [
      { quantity: 0.5, item: { isOrganic: false } },
      { quantity: 3, item: { isOrganic: true } },
      { quantity: 0.25, item: { isOrganic: false } },
      { quantity: 1, item: { isOrganic: false } },
      { quantity: 1, item: { isOrganic: false } },
      { quantity: 1, item: { isOrganic: false } }
    ]
  };

  it("calculates totalVolumeMl as sum of all quantities", () => {
    const result = computeProductMetrics(productA);
    // 0.5 + 3 + 0.25 + 1 + 1 + 1 = 6.75
    expect(result.totalVolumeMl).toBeCloseTo(6.75, 4);
  });

  it("calculates yield1oz by dividing totalVolumeMl by 29.5735", () => {
    const result = computeProductMetrics(productA);
    expect(result.yield1oz).toBeCloseTo(6.75 / 29.5735, 4);
  });

  it("calculates yield90 as yield1oz * 0.9", () => {
    const result = computeProductMetrics(productA);
    expect(result.yield90).toBeCloseTo((6.75 / 29.5735) * 0.9, 4);
  });

  it("calculates organicVolumeMl from only organic items", () => {
    const result = computeProductMetrics(productA);
    // Only Carrier Oil (3ml) is organic
    expect(result.organicVolumeMl).toBeCloseTo(3, 4);
  });

  it("calculates organicPercent as organic / total * 100", () => {
    const result = computeProductMetrics(productA);
    expect(result.organicPercent).toBeCloseTo((3 / 6.75) * 100, 2);
  });

  it("counts all BOM entries as ingredientCount", () => {
    const result = computeProductMetrics(productA);
    expect(result.ingredientCount).toBe(6);
  });

  // Product_B: Retinol 0.4, Aloe 4 (organic), Chamomile 0.6 (organic),
  //            Preservative 0.2, Bottle 1, Pump 1, Carton 1
  it("handles multiple organic ingredients (Product_B)", () => {
    const result = computeProductMetrics({
      bom: [
        { quantity: 0.4, item: { isOrganic: false } },
        { quantity: 4, item: { isOrganic: true } },
        { quantity: 0.6, item: { isOrganic: true } },
        { quantity: 0.2, item: { isOrganic: false } },
        { quantity: 1, item: { isOrganic: false } },
        { quantity: 1, item: { isOrganic: false } },
        { quantity: 1, item: { isOrganic: false } }
      ]
    });
    // total = 0.4+4+0.6+0.2+1+1+1 = 8.2
    expect(result.totalVolumeMl).toBeCloseTo(8.2, 4);
    // organic = 4 + 0.6 = 4.6
    expect(result.organicVolumeMl).toBeCloseTo(4.6, 4);
    expect(result.organicPercent).toBeCloseTo((4.6 / 8.2) * 100, 2);
    expect(result.ingredientCount).toBe(7);
  });

  it("handles product with no organic ingredients", () => {
    const result = computeProductMetrics({
      bom: [
        { quantity: 5, item: { isOrganic: false } },
        { quantity: 3, item: { isOrganic: false } }
      ]
    });
    expect(result.organicVolumeMl).toBe(0);
    expect(result.organicPercent).toBe(0);
  });

  it("handles empty BOM", () => {
    const result = computeProductMetrics({ bom: [] });
    expect(result.totalVolumeMl).toBe(0);
    expect(result.yield1oz).toBe(0);
    expect(result.yield90).toBe(0);
    expect(result.organicVolumeMl).toBe(0);
    expect(result.organicPercent).toBe(0);
    expect(result.ingredientCount).toBe(0);
  });

  it("treats missing isOrganic as non-organic", () => {
    const result = computeProductMetrics({
      bom: [{ quantity: 10, item: {} }]
    });
    expect(result.totalVolumeMl).toBe(10);
    expect(result.organicVolumeMl).toBe(0);
    expect(result.organicPercent).toBe(0);
  });
});
