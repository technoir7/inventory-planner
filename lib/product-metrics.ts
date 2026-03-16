/**
 * Spreadsheet-style product metrics derived from BOM data.
 *
 * Restores: Total Volume per Batch, Yield (1 fl oz), Yield 90%,
 * Organic Volume, % Organic, Ingredient Count.
 */

const ML_PER_FL_OZ = 29.5735;

export interface BomEntry {
  quantity: number;
  item: {
    isOrganic?: boolean;
  };
}

export interface ProductInput {
  bom: BomEntry[];
}

export interface ProductMetrics {
  totalVolumeMl: number;
  yield1oz: number;
  yield90: number;
  organicVolumeMl: number;
  organicPercent: number;
  ingredientCount: number;
}

export function computeProductMetrics(product: ProductInput): ProductMetrics {
  let totalVolumeMl = 0;
  let organicVolumeMl = 0;

  for (const entry of product.bom) {
    totalVolumeMl += entry.quantity;
    if (entry.item.isOrganic) {
      organicVolumeMl += entry.quantity;
    }
  }

  const yield1oz = totalVolumeMl / ML_PER_FL_OZ;
  const yield90 = yield1oz * 0.9;
  const organicPercent =
    totalVolumeMl === 0 ? 0 : (organicVolumeMl / totalVolumeMl) * 100;

  return {
    totalVolumeMl,
    yield1oz,
    yield90,
    organicVolumeMl,
    organicPercent,
    ingredientCount: product.bom.length
  };
}
