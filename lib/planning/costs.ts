/**
 * Formula cost rollup calculations.
 *
 * Restores spreadsheet-derived cost analysis: ingredient cost contribution,
 * total formula cost, cost per unit, cost per oz, and margin analysis.
 */

export interface CostItem {
  costPerUnit: number;
  unitOfMeasure: string;
}

export interface CostBomLine {
  componentItemId: string;
  quantityRequired: number;
}

export interface CostBom {
  batchSize: number;
  yieldPercent: number;
  targetPrice: number | null;
  fillSizeOz: number | null;
  lines: CostBomLine[];
}

export interface IngredientCostContribution {
  componentItemId: string;
  quantityRequired: number;
  costPerUnit: number;
  unitOfMeasure: string;
  lineCost: number;
  percentOfFormula: number;
}

export interface FormulaCostRollup {
  batchSize: number;
  yieldPercent: number;
  effectiveUnitsPerBatch: number;
  ingredientCosts: IngredientCostContribution[];
  totalBatchCost: number;
  costPerUnit: number;
  costPerOz: number | null;
  targetPrice: number | null;
  grossMargin: number | null;
  grossMarginPercent: number | null;
}

/**
 * Calculate the cost contribution of each BOM line and roll up to batch/unit/oz costs.
 */
export function calculateFormulaCost(
  bom: CostBom,
  itemById: Map<string, CostItem>
): FormulaCostRollup {
  const effectiveBatchSize = bom.batchSize > 0 ? bom.batchSize : 1;
  const yieldFraction = bom.yieldPercent > 0 ? bom.yieldPercent / 100 : 1;
  const effectiveUnitsPerBatch = effectiveBatchSize * yieldFraction;

  const ingredientCosts: IngredientCostContribution[] = [];
  let totalBatchCost = 0;

  for (const line of bom.lines) {
    const item = itemById.get(line.componentItemId);
    const costPerUnit = item?.costPerUnit ?? 0;
    const unitOfMeasure = item?.unitOfMeasure ?? "";
    const lineCost = line.quantityRequired * costPerUnit;
    totalBatchCost += lineCost;

    ingredientCosts.push({
      componentItemId: line.componentItemId,
      quantityRequired: line.quantityRequired,
      costPerUnit,
      unitOfMeasure,
      lineCost,
      percentOfFormula: 0 // filled in below
    });
  }

  // Fill in percentOfFormula
  for (const entry of ingredientCosts) {
    entry.percentOfFormula = totalBatchCost > 0 ? (entry.lineCost / totalBatchCost) * 100 : 0;
  }

  const costPerUnit = effectiveUnitsPerBatch > 0 ? totalBatchCost / effectiveUnitsPerBatch : 0;
  const costPerOz =
    bom.fillSizeOz && bom.fillSizeOz > 0 ? costPerUnit / bom.fillSizeOz : null;

  const grossMargin =
    bom.targetPrice !== null ? bom.targetPrice - costPerUnit : null;
  const grossMarginPercent =
    bom.targetPrice !== null && bom.targetPrice > 0
      ? ((bom.targetPrice - costPerUnit) / bom.targetPrice) * 100
      : null;

  return {
    batchSize: effectiveBatchSize,
    yieldPercent: bom.yieldPercent,
    effectiveUnitsPerBatch,
    ingredientCosts,
    totalBatchCost,
    costPerUnit,
    costPerOz,
    targetPrice: bom.targetPrice,
    grossMargin,
    grossMarginPercent
  };
}

/**
 * Calculate cost rollups for multiple BOMs at once.
 */
export function calculateAllFormulaCosts(
  boms: Array<CostBom & { finishedGoodItemId: string }>,
  itemById: Map<string, CostItem>
): Map<string, FormulaCostRollup> {
  const result = new Map<string, FormulaCostRollup>();
  for (const bom of boms) {
    result.set(bom.finishedGoodItemId, calculateFormulaCost(bom, itemById));
  }
  return result;
}
