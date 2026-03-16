import { describe, expect, it } from "vitest";
import { PlanningItem } from "@/lib/planning/types";
import { selectPurchaseQuantityWithDiscountTiers } from "@/lib/planning/purchasing";

const item: PlanningItem = {
  id: "retinol",
  name: "Retinol",
  category: "RAW_MATERIAL",
  unitOfMeasure: "ml",
  leadTimeDays: 7,
  minimumOrderQuantity: 25,
  orderMultiple: 5,
  costPerUnit: 10,
  safetyStock: 0
};

describe("selectPurchaseQuantityWithDiscountTiers", () => {
  it("uses standard ordering constraints when no tiers are provided", () => {
    expect(selectPurchaseQuantityWithDiscountTiers(28, item)).toMatchObject({
      recommendedQty: 30,
      appliedTier: null,
      estimatedExtendedCost: 300
    });
  });

  it("can choose a larger discounted tier when total cost is lower", () => {
    expect(
      selectPurchaseQuantityWithDiscountTiers(28, item, [
        { minimumQuantity: 50, unitCost: 5.5 },
        { minimumQuantity: 100, unitCost: 4.8 }
      ])
    ).toMatchObject({
      recommendedQty: 50,
      appliedTier: { minimumQuantity: 50, unitCost: 5.5 },
      estimatedExtendedCost: 275
    });
  });
});
