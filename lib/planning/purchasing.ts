import { PlanningItem } from "@/lib/planning/types";
import { roundToOrderingConstraints } from "@/lib/planning/engine";

export interface DiscountTier {
  minimumQuantity: number;
  unitCost: number;
}

export interface PurchaseQuantityDecision {
  recommendedQty: number;
  appliedTier: DiscountTier | null;
  estimatedExtendedCost: number;
}

export function selectPurchaseQuantityWithDiscountTiers(
  requiredQty: number,
  item: PlanningItem,
  tiers: DiscountTier[] = []
): PurchaseQuantityDecision {
  const baseQty = roundToOrderingConstraints(requiredQty, item);
  const baseCost = baseQty * item.costPerUnit;

  const candidateDecisions = tiers
    .filter((tier) => tier.minimumQuantity > 0 && tier.minimumQuantity >= requiredQty)
    .map((tier) => {
      const roundedQty = roundToOrderingConstraints(tier.minimumQuantity, item);
      return {
        recommendedQty: roundedQty,
        appliedTier: tier,
        estimatedExtendedCost: roundedQty * tier.unitCost
      };
    });

  const baselineDecision: PurchaseQuantityDecision = {
    recommendedQty: baseQty,
    appliedTier: null,
    estimatedExtendedCost: baseCost
  };

  return [baselineDecision, ...candidateDecisions].sort((left, right) => {
    if (left.estimatedExtendedCost !== right.estimatedExtendedCost) {
      return left.estimatedExtendedCost - right.estimatedExtendedCost;
    }

    return left.recommendedQty - right.recommendedQty;
  })[0];
}
