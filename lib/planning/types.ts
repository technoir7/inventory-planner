export type PlanningItemCategory = "RAW_MATERIAL" | "PACKAGING" | "FINISHED_GOOD";

export interface PlanningItem {
  id: string;
  name: string;
  category: PlanningItemCategory;
  unitOfMeasure: string;
  leadTimeDays: number;
  minimumOrderQuantity: number;
  orderMultiple: number;
  costPerUnit: number;
  safetyStock: number;
}

export interface PlanningBomLine {
  componentItemId: string;
  quantityRequired: number;
}

export interface PlanningBom {
  finishedGoodItemId: string;
  batchSize: number;
  lines: PlanningBomLine[];
}

export interface PlanningInventoryLot {
  id: string;
  itemId: string;
  lotCode: string;
  receivedDate: Date;
  expirationDate: Date | null;
  quantityAvailable: number;
  quantityAllocated: number;
}

export interface PlanningPurchaseOrderLine {
  itemId: string;
  quantity: number;
}

export interface PlanningPurchaseOrder {
  id: string;
  expectedReceiptDate: Date;
  status: "OPEN" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
  lines: PlanningPurchaseOrderLine[];
}

export interface PlanningProductionPlanLine {
  finishedGoodItemId: string;
  quantity: number;
  scheduledDate: Date | null;
}

export interface PlanningProductionPlan {
  id: string;
  startDate: Date;
  endDate: Date;
  lines: PlanningProductionPlanLine[];
}

export interface DemandTimelineEntry {
  itemId: string;
  date: Date;
  quantity: number;
  sourceFinishedGoodItemId: string;
}

export interface PlanningInboundEvent {
  date: Date;
  quantity: number;
  sourceType: "PURCHASE_ORDER" | "INVENTORY_LOT";
  referenceId: string;
  referenceLabel: string;
}

export interface PlanningLotConsumption {
  lotId: string;
  lotCode: string;
  quantity: number;
  sourceType: "PURCHASE_ORDER" | "INVENTORY_LOT";
}

export interface PlanningDemandTraceEntry {
  date: Date;
  quantity: number;
  sourceFinishedGoodItemId: string;
  sourceFinishedGoodName: string;
  fulfilledQuantity: number;
  shortageQuantity: number;
  insideLeadTimeWindow: boolean;
  beforeNextReceiptWindow: boolean;
  lotConsumptions: PlanningLotConsumption[];
}

export interface PlanningLotTrace {
  lotId: string;
  lotCode: string;
  receivedDate: Date;
  expirationDate: Date | null;
  quantityAllocated: number;
  startingUsableQuantity: number;
  projectedConsumedQuantity: number;
  projectedRemainingQuantity: number;
  projectedWasteQuantity: number;
  fullyConsumedBeforeExpiration: boolean;
}

export interface PlanningOrderingAdjustment {
  rawRequiredQty: number;
  roundedQty: number;
  roundedUpBy: number;
  minimumOrderQuantity: number;
  orderMultiple: number;
  moqApplied: boolean;
  orderMultipleApplied: boolean;
}

export interface PlanningRecommendationExplanation {
  currentUsableInventory: number;
  inboundInventory: PlanningInboundEvent[];
  datedDemand: PlanningDemandTraceEntry[];
  reorderPoint: number;
  safetyStock: number;
  demandDuringLeadTime: number;
  projectedInventoryAtReceipt: number;
  orderingAdjustment: PlanningOrderingAdjustment;
  expiryRiskInfluenced: boolean;
  expiryRiskNotes: string[];
}

export interface PlanningShortageEvent {
  date: Date;
  sourceFinishedGoodItemId: string;
  sourceFinishedGoodName: string;
  shortageQuantity: number;
}

export interface PlanningItemTrace {
  itemId: string;
  itemName: string;
  category: PlanningItemCategory;
  unitOfMeasure: string;
  currentUsableInventory: number;
  inboundInventory: PlanningInboundEvent[];
  lotsInFefoOrder: PlanningLotTrace[];
  projectedConsumption: PlanningDemandTraceEntry[];
  shortageEvents: PlanningShortageEvent[];
  projectedExpiryWaste: number;
  firstShortageDate: Date | null;
  reorderPoint: number;
  safetyStock: number;
}

export interface ExpiringLotRisk {
  lotId: string;
  lotCode: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  quantityAvailable: number;
  projectedConsumptionBeforeExpiration: number;
  projectedWasteQuantity: number;
  fullyConsumedBeforeExpiration: boolean;
}

export interface ExpiredLotRisk {
  lotId: string;
  lotCode: string;
  expirationDate: Date;
  daysExpired: number;
  quantityAvailable: number;
}

export interface ItemPlanningMetrics {
  itemId: string;
  itemName: string;
  category: PlanningItemCategory;
  onHand: number;
  allocated: number;
  expiredQuantity: number;
  inbound: number;
  netAvailable: number;
  totalDemand: number;
  demandDuringLeadTime: number;
  reorderPoint: number;
  daysOfCover: number | null;
  projectedStockoutDate: Date | null;
  projectedInventoryAtReceipt: number;
  shortageQuantity: number;
  blockedUntilReceipt: boolean;
  firstShortageDate: Date | null;
}

export interface PlanningRecommendation {
  itemId: string;
  itemName: string;
  recommendedQty: number;
  orderByDate: Date;
  reason: string;
  priorityScore: number;
  explanation: PlanningRecommendationExplanation;
}

export interface PlanningAlertWhy {
  summary: string;
  currentUsableInventory: number;
  shortageQuantity: number;
  firstShortageDate: Date | null;
  receiptDate: Date | null;
  inboundInventory: PlanningInboundEvent[];
  datedDemand: PlanningDemandTraceEntry[];
}

export interface PlanningAlert {
  itemId: string;
  itemName: string;
  alertType: "STOCKOUT_RISK" | "EXPIRING_LOT" | "REORDER";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  why?: PlanningAlertWhy;
}

export interface PlanningResult {
  demandByItemId: Record<string, number>;
  demandTimelineByItemId: Record<string, DemandTimelineEntry[]>;
  inventoryMetrics: ItemPlanningMetrics[];
  itemTraces: Record<string, PlanningItemTrace>;
  recommendations: PlanningRecommendation[];
  alerts: PlanningAlert[];
  expiringLots: Array<
    ExpiringLotRisk & {
      itemId: string;
      itemName: string;
    }
  >;
  expiredLots: Array<
    ExpiredLotRisk & {
      itemId: string;
      itemName: string;
    }
  >;
}

export interface PlanningInput {
  items: PlanningItem[];
  boms: PlanningBom[];
  inventoryLots: PlanningInventoryLot[];
  purchaseOrders: PlanningPurchaseOrder[];
  productionPlans: PlanningProductionPlan[];
  planningHorizonDays: number;
  expirationWindowDays: number;
  today: Date;
}
