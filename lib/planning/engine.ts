import { addDays, diffInDays, startOfDay } from "@/lib/dates";
import {
  DemandTimelineEntry,
  ItemPlanningMetrics,
  PlanningAlertWhy,
  PlanningAlert,
  PlanningBom,
  PlanningDemandTraceEntry,
  PlanningInput,
  PlanningInboundEvent,
  PlanningItem,
  PlanningItemTrace,
  PlanningLotTrace,
  PlanningRecommendation,
  PlanningResult
} from "@/lib/planning/types";

const ACTIVE_PO_STATUSES = new Set(["OPEN", "PARTIALLY_RECEIVED"]);

type ReceiptEvent = PlanningInboundEvent;
type TimelineLotState = {
  id: string;
  lotCode: string;
  receivedDate: Date;
  expirationDate: Date | null;
  remaining: number;
  initialRemaining: number;
  source: "inventory" | "purchase_order";
};

type DemandFulfillment = {
  date: Date;
  quantity: number;
  sourceFinishedGoodItemId: string;
  fulfilledQuantity: number;
  shortageQuantity: number;
  lotConsumptions: Array<{
    lotId: string;
    lotCode: string;
    quantity: number;
    sourceType: "PURCHASE_ORDER" | "INVENTORY_LOT";
  }>;
};

type SimulationResult = {
  shortageQuantity: number;
  firstShortageDate: Date | null;
  remainingQuantity: number;
  lotStates: TimelineLotState[];
  remainingByLotId: Record<string, number>;
  consumedByLotId: Record<string, number>;
  demandFulfillments: DemandFulfillment[];
};

export function explodeBomDemand(input: Pick<PlanningInput, "boms" | "productionPlans">) {
  const timeline = explodeBomDemandByDate(input);
  return Object.fromEntries(
    Object.entries(timeline).map(([itemId, entries]) => [
      itemId,
      entries.reduce((sum, entry) => sum + entry.quantity, 0)
    ])
  );
}

export function explodeBomDemandByDate(input: Pick<PlanningInput, "boms" | "productionPlans">) {
  const bomByFinishedGood = new Map<string, PlanningBom>();

  for (const bom of input.boms) {
    bomByFinishedGood.set(bom.finishedGoodItemId, bom);
  }

  const timelineByItemId: Record<string, DemandTimelineEntry[]> = {};

  for (const plan of input.productionPlans) {
    for (const line of plan.lines) {
      const bom = bomByFinishedGood.get(line.finishedGoodItemId);
      if (!bom || bom.batchSize <= 0) {
        continue;
      }

      const scheduledDate = startOfDay(line.scheduledDate ?? plan.startDate);
      const scale = line.quantity / bom.batchSize;
      for (const bomLine of bom.lines) {
        const itemTimeline = timelineByItemId[bomLine.componentItemId] ?? [];
        itemTimeline.push({
          itemId: bomLine.componentItemId,
          date: scheduledDate,
          quantity: bomLine.quantityRequired * scale,
          sourceFinishedGoodItemId: line.finishedGoodItemId
        });
        timelineByItemId[bomLine.componentItemId] = itemTimeline;
      }
    }
  }

  for (const entries of Object.values(timelineByItemId)) {
    entries.sort((left, right) => left.date.getTime() - right.date.getTime());
  }

  return timelineByItemId;
}

export function roundToOrderingConstraints(quantity: number, item: PlanningItem) {
  const safeQty = Math.max(0, quantity);
  const moq = item.minimumOrderQuantity > 0 ? item.minimumOrderQuantity : 0;
  const multiple = item.orderMultiple > 0 ? item.orderMultiple : 1;
  const afterMoq = Math.max(safeQty, moq);
  return Math.ceil(afterMoq / multiple) * multiple;
}

export function calculateProjectedStockoutDate(
  today: Date,
  dailyDemand: number,
  startingInventory: number,
  receipts: Array<{ date: Date; quantity: number }>
) {
  if (dailyDemand <= 0) {
    return null;
  }

  const orderedReceipts = [...receipts].sort((left, right) => left.date.getTime() - right.date.getTime());
  let inventory = startingInventory;
  let cursor = today;

  for (const receipt of orderedReceipts) {
    const daysUntilReceipt = Math.max(0, diffInDays(cursor, receipt.date));
    const inventoryBeforeReceipt = inventory - dailyDemand * daysUntilReceipt;

    if (inventoryBeforeReceipt < 0) {
      const daysToDeplete = Math.max(0, Math.floor(inventory / dailyDemand));
      return addDays(cursor, daysToDeplete);
    }

    inventory = inventoryBeforeReceipt + receipt.quantity;
    cursor = receipt.date;
  }

  if (inventory < 0) {
    return today;
  }

  const daysToDeplete = Math.floor(inventory / dailyDemand);
  return addDays(cursor, daysToDeplete);
}

function calculateSeverity(priorityScore: number): PlanningAlert["severity"] {
  if (priorityScore >= 90) {
    return "CRITICAL";
  }
  if (priorityScore >= 70) {
    return "HIGH";
  }
  if (priorityScore >= 45) {
    return "MEDIUM";
  }
  return "LOW";
}

function isExpiredLot(expirationDate: Date | null, today: Date) {
  return Boolean(expirationDate && startOfDay(expirationDate) < today);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
}

function sortLotsFefo(left: TimelineLotState, right: TimelineLotState) {
  const leftExpiry = left.expirationDate ? left.expirationDate.getTime() : Number.MAX_SAFE_INTEGER;
  const rightExpiry = right.expirationDate ? right.expirationDate.getTime() : Number.MAX_SAFE_INTEGER;
  if (leftExpiry !== rightExpiry) {
    return leftExpiry - rightExpiry;
  }

  return left.receivedDate.getTime() - right.receivedDate.getTime();
}

function buildPurchaseReceiptEvents(input: PlanningInput, itemId: string) {
  return input.purchaseOrders
    .filter(
      (purchaseOrder) =>
        ACTIVE_PO_STATUSES.has(purchaseOrder.status) &&
        startOfDay(purchaseOrder.expectedReceiptDate) >= startOfDay(input.today)
    )
    .map((purchaseOrder) => ({
      date: startOfDay(purchaseOrder.expectedReceiptDate),
      sourceType: "PURCHASE_ORDER" as const,
      referenceId: purchaseOrder.id,
      referenceLabel: `PO ${purchaseOrder.id}`,
      quantity: purchaseOrder.lines
        .filter((line) => line.itemId === itemId)
        .reduce((sum, line) => sum + line.quantity, 0)
    }))
    .filter((receipt) => receipt.quantity > 0)
    .sort((left, right) => left.date.getTime() - right.date.getTime());
}

function buildFutureInventoryReceiptEvents(input: PlanningInput, itemId: string) {
  return input.inventoryLots
    .filter((lot) => lot.itemId === itemId)
    .filter((lot) => startOfDay(lot.receivedDate) > startOfDay(input.today))
    .map((lot) => ({
      date: startOfDay(lot.receivedDate),
      quantity: Math.max(0, lot.quantityAvailable - lot.quantityAllocated),
      sourceType: "INVENTORY_LOT" as const,
      referenceId: lot.id,
      referenceLabel: lot.lotCode
    }))
    .filter((receipt) => receipt.quantity > 0)
    .sort((left, right) => left.date.getTime() - right.date.getTime());
}

function buildInboundInventoryEvents(input: PlanningInput, itemId: string) {
  return [...buildFutureInventoryReceiptEvents(input, itemId), ...buildPurchaseReceiptEvents(input, itemId)].sort(
    (left, right) => left.date.getTime() - right.date.getTime()
  );
}

function simulateItemTimeline(args: {
  today: Date;
  endDate: Date;
  lots: PlanningInput["inventoryLots"];
  demandTimeline: DemandTimelineEntry[];
  purchaseReceipts: ReceiptEvent[];
}) {
  const today = startOfDay(args.today);
  const endDate = startOfDay(args.endDate);
  const activeLots: TimelineLotState[] = args.lots
    .filter((lot) => startOfDay(lot.receivedDate) <= today)
    .filter((lot) => !isExpiredLot(lot.expirationDate, today))
    .map((lot) => ({
      id: lot.id,
      lotCode: lot.lotCode,
      receivedDate: startOfDay(lot.receivedDate),
      expirationDate: lot.expirationDate ? startOfDay(lot.expirationDate) : null,
      remaining: Math.max(0, lot.quantityAvailable - lot.quantityAllocated),
      initialRemaining: Math.max(0, lot.quantityAvailable - lot.quantityAllocated),
      source: "inventory" as const
    }))
    .filter((lot) => lot.remaining > 0);

  const futureInventoryLots = args.lots
    .filter((lot) => startOfDay(lot.receivedDate) > today && startOfDay(lot.receivedDate) <= endDate)
    .map((lot) => ({
      date: startOfDay(lot.receivedDate),
      type: "receipt" as const,
      lot: {
        id: lot.id,
        lotCode: lot.lotCode,
        receivedDate: startOfDay(lot.receivedDate),
        expirationDate: lot.expirationDate ? startOfDay(lot.expirationDate) : null,
        remaining: Math.max(0, lot.quantityAvailable - lot.quantityAllocated),
        initialRemaining: Math.max(0, lot.quantityAvailable - lot.quantityAllocated),
        source: "inventory" as const
      }
    }))
    .filter((event) => event.lot.remaining > 0);

  const purchaseReceiptLots = args.purchaseReceipts
    .filter((receipt) => receipt.date <= endDate)
    .map((receipt, index) => ({
      date: receipt.date,
      type: "receipt" as const,
      lot: {
        id: receipt.referenceId || `po-${index}-${receipt.date.toISOString()}`,
        lotCode: receipt.referenceLabel,
        receivedDate: receipt.date,
        expirationDate: null,
        remaining: receipt.quantity,
        initialRemaining: receipt.quantity,
        source: "purchase_order" as const
      }
    }));

  const demandEvents = args.demandTimeline
    .filter((entry) => entry.date <= endDate)
    .map((entry) => ({
      date: startOfDay(entry.date),
      type: "demand" as const,
      quantity: entry.quantity,
      sourceFinishedGoodItemId: entry.sourceFinishedGoodItemId
    }));

  const events = [...futureInventoryLots, ...purchaseReceiptLots, ...demandEvents].sort((left, right) => {
    const dateDiff = left.date.getTime() - right.date.getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return left.type === right.type ? 0 : left.type === "receipt" ? -1 : 1;
  });

  const consumedByLotId: Record<string, number> = {};
  const demandFulfillments: DemandFulfillment[] = [];
  let shortageQuantity = 0;
  let firstShortageDate: Date | null = null;

  for (const event of events) {
    for (let index = activeLots.length - 1; index >= 0; index -= 1) {
      if (isExpiredLot(activeLots[index].expirationDate, event.date)) {
        activeLots.splice(index, 1);
      }
    }

    if (event.type === "receipt") {
      activeLots.push({ ...event.lot });
      continue;
    }

    let remainingDemand = event.quantity;
    const lotConsumptions: DemandFulfillment["lotConsumptions"] = [];
    activeLots.sort(sortLotsFefo);

    for (const lot of activeLots) {
      if (remainingDemand <= 0) {
        break;
      }

      if (lot.remaining <= 0) {
        continue;
      }

      const consumed = Math.min(lot.remaining, remainingDemand);
      lot.remaining -= consumed;
      remainingDemand -= consumed;
      consumedByLotId[lot.id] = (consumedByLotId[lot.id] ?? 0) + consumed;
      lotConsumptions.push({
        lotId: lot.id,
        lotCode: lot.lotCode,
        quantity: consumed,
        sourceType: lot.source === "purchase_order" ? "PURCHASE_ORDER" : "INVENTORY_LOT"
      });
    }

    if (remainingDemand > 0) {
      shortageQuantity += remainingDemand;
      firstShortageDate ??= event.date;
    }

    demandFulfillments.push({
      date: event.date,
      quantity: event.quantity,
      sourceFinishedGoodItemId: event.sourceFinishedGoodItemId,
      fulfilledQuantity: event.quantity - remainingDemand,
      shortageQuantity: remainingDemand,
      lotConsumptions
    });
  }

  for (let index = activeLots.length - 1; index >= 0; index -= 1) {
    if (isExpiredLot(activeLots[index].expirationDate, endDate)) {
      activeLots.splice(index, 1);
    }
  }

  const remainingByLotId = Object.fromEntries(activeLots.map((lot) => [lot.id, lot.remaining]));

  return {
    shortageQuantity,
    firstShortageDate,
    remainingQuantity: activeLots.reduce((sum, lot) => sum + lot.remaining, 0),
    lotStates: activeLots,
    remainingByLotId,
    consumedByLotId,
    demandFulfillments
  } satisfies SimulationResult;
}

function validatePlanningInput(input: PlanningInput) {
  const itemIds = new Set<string>();
  const itemById = new Map<string, PlanningItem>();

  for (const item of input.items) {
    if (!item.unitOfMeasure.trim()) {
      throw new Error(`Item "${item.name}" is missing a unit of measure.`);
    }

    if (itemIds.has(item.id)) {
      throw new Error(`Duplicate item id "${item.id}" found in planning input.`);
    }

    itemIds.add(item.id);
    itemById.set(item.id, item);
  }

  for (const bom of input.boms) {
    if (!itemById.has(bom.finishedGoodItemId)) {
      throw new Error(`BOM references unknown finished good item "${bom.finishedGoodItemId}".`);
    }

    for (const line of bom.lines) {
      if (!itemById.has(line.componentItemId)) {
        throw new Error(`BOM references unknown component item "${line.componentItemId}".`);
      }
    }
  }

  for (const plan of input.productionPlans) {
    for (const line of plan.lines) {
      if (line.scheduledDate) {
        const scheduledDate = startOfDay(line.scheduledDate);
        if (scheduledDate < startOfDay(plan.startDate) || scheduledDate > startOfDay(plan.endDate)) {
          throw new Error(
            `Production plan line for "${line.finishedGoodItemId}" has scheduledDate outside the plan window.`
          );
        }
      }
    }
  }
}

function buildDemandTraceEntries(args: {
  fulfillments: SimulationResult["demandFulfillments"];
  itemById: Map<string, PlanningItem>;
  leadTimeWindowEnd: Date;
  receiptDate: Date;
}) {
  return args.fulfillments.map((fulfillment): PlanningDemandTraceEntry => ({
    date: fulfillment.date,
    quantity: fulfillment.quantity,
    sourceFinishedGoodItemId: fulfillment.sourceFinishedGoodItemId,
    sourceFinishedGoodName:
      args.itemById.get(fulfillment.sourceFinishedGoodItemId)?.name ?? fulfillment.sourceFinishedGoodItemId,
    fulfilledQuantity: fulfillment.fulfilledQuantity,
    shortageQuantity: fulfillment.shortageQuantity,
    insideLeadTimeWindow: fulfillment.date <= args.leadTimeWindowEnd,
    beforeNextReceiptWindow: fulfillment.date <= args.receiptDate,
    lotConsumptions: fulfillment.lotConsumptions
  }));
}

function buildLotTrace(args: {
  lots: PlanningInput["inventoryLots"];
  consumedByLotId: Record<string, number>;
  remainingByLotId: Record<string, number>;
  today: Date;
  projectedWasteByLotId: Record<string, number>;
}) {
  const lotTraces = args.lots
    .map((lot): PlanningLotTrace => {
      const startingUsableQuantity =
        startOfDay(lot.receivedDate) <= args.today && !isExpiredLot(lot.expirationDate, args.today)
          ? Math.max(0, lot.quantityAvailable - lot.quantityAllocated)
          : 0;
      const projectedConsumedQuantity = args.consumedByLotId[lot.id] ?? 0;
      const projectedWasteQuantity = args.projectedWasteByLotId[lot.id] ?? 0;
      const projectedRemainingQuantity = Math.max(
        0,
        (args.remainingByLotId[lot.id] ?? (startingUsableQuantity - projectedConsumedQuantity)) - projectedWasteQuantity
      );

      return {
        lotId: lot.id,
        lotCode: lot.lotCode,
        receivedDate: lot.receivedDate,
        expirationDate: lot.expirationDate,
        quantityAllocated: lot.quantityAllocated,
        startingUsableQuantity,
        projectedConsumedQuantity,
        projectedRemainingQuantity,
        projectedWasteQuantity,
        fullyConsumedBeforeExpiration: projectedWasteQuantity === 0
      };
    })
    .sort((left, right) => {
      const leftExpiry = left.expirationDate ? startOfDay(left.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
      const rightExpiry = right.expirationDate ? startOfDay(right.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
      if (leftExpiry !== rightExpiry) {
        return leftExpiry - rightExpiry;
      }

      return startOfDay(left.receivedDate).getTime() - startOfDay(right.receivedDate).getTime();
    });

  return lotTraces;
}

function buildBlockedAlertWhy(args: {
  itemName: string;
  unitOfMeasure: string;
  currentUsableInventory: number;
  shortageQuantity: number;
  firstShortageDate: Date | null;
  receiptDate: Date;
  inboundInventory: PlanningInboundEvent[];
  datedDemand: PlanningDemandTraceEntry[];
}): PlanningAlertWhy {
  const shortageDateLabel = (args.firstShortageDate ?? args.receiptDate).toISOString().slice(0, 10);
  return {
    summary: `${args.itemName} runs short by ${formatNumber(args.shortageQuantity)} ${args.unitOfMeasure} on ${shortageDateLabel} before the next replenishment window.`,
    currentUsableInventory: args.currentUsableInventory,
    shortageQuantity: args.shortageQuantity,
    firstShortageDate: args.firstShortageDate,
    receiptDate: args.receiptDate,
    inboundInventory: args.inboundInventory,
    datedDemand: args.datedDemand.filter((entry) => entry.beforeNextReceiptWindow || entry.shortageQuantity > 0)
  };
}

export function runPlanningEngine(input: PlanningInput): PlanningResult {
  validatePlanningInput(input);

  const today = startOfDay(input.today);
  const horizonDays = Math.max(1, input.planningHorizonDays);
  const horizonEnd = addDays(today, horizonDays);
  const demandTimelineByItemId = explodeBomDemandByDate(input);
  const demandByItemId = Object.fromEntries(
    Object.entries(demandTimelineByItemId).map(([itemId, entries]) => [
      itemId,
      entries.reduce((sum, entry) => sum + entry.quantity, 0)
    ])
  );
  const itemById = new Map(input.items.map((item) => [item.id, item]));

  const itemMetrics: ItemPlanningMetrics[] = [];
  const itemTraces: Record<string, PlanningItemTrace> = {};
  const recommendations: PlanningRecommendation[] = [];
  const alerts: PlanningAlert[] = [];

  for (const item of input.items) {
    const lots = input.inventoryLots.filter((lot) => lot.itemId === item.id);
    const usableLots = lots.filter(
      (lot) => !isExpiredLot(lot.expirationDate, today) && startOfDay(lot.receivedDate) <= today
    );
    const onHand = usableLots.reduce((sum, lot) => sum + lot.quantityAvailable, 0);
    const allocated = lots.reduce((sum, lot) => sum + lot.quantityAllocated, 0);
    const currentUsableInventory = usableLots.reduce(
      (sum, lot) => sum + Math.max(0, lot.quantityAvailable - lot.quantityAllocated),
      0
    );
    const expiredQuantity = lots
      .filter((lot) => isExpiredLot(lot.expirationDate, today))
      .reduce((sum, lot) => sum + lot.quantityAvailable, 0);

    const demandTimeline = demandTimelineByItemId[item.id] ?? [];
    const inboundInventory = buildInboundInventoryEvents(input, item.id);
    const purchaseReceipts = buildPurchaseReceiptEvents(input, item.id);
    const inbound = purchaseReceipts.reduce((sum, receipt) => sum + receipt.quantity, 0);
    const totalDemand = demandByItemId[item.id] ?? 0;
    const receiptDate = addDays(today, item.leadTimeDays);
    const demandDuringLeadTime = demandTimeline
      .filter((entry) => entry.date <= receiptDate)
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const reorderPoint = demandDuringLeadTime + item.safetyStock;
    const netAvailable = onHand + inbound - allocated;
    const dailyDemand = totalDemand / horizonDays;
    const fullSimulation = simulateItemTimeline({
      today,
      endDate: horizonEnd,
      lots,
      demandTimeline,
      purchaseReceipts
    });
    const receiptSimulation = simulateItemTimeline({
      today,
      endDate: receiptDate,
      lots,
      demandTimeline,
      purchaseReceipts
    });

    const projectedStockoutDate = fullSimulation.firstShortageDate;
    const daysOfCover =
      projectedStockoutDate !== null ? Math.max(0, diffInDays(today, projectedStockoutDate)) : dailyDemand > 0 ? horizonDays : null;
    const projectedInventoryAtReceipt = receiptSimulation.remainingQuantity;
    const shortageQuantity = receiptSimulation.shortageQuantity;
    const blockedUntilReceipt = shortageQuantity > 0;
    const firstShortageDate = receiptSimulation.firstShortageDate;
    const targetStockLevel = totalDemand + item.safetyStock;
    const demandTrace = buildDemandTraceEntries({
      fulfillments: fullSimulation.demandFulfillments,
      itemById,
      leadTimeWindowEnd: receiptDate,
      receiptDate
    });
    const projectedWasteByLotId = Object.fromEntries(
      lots.map((lot) => {
        if (!lot.expirationDate || isExpiredLot(lot.expirationDate, today)) {
          return [lot.id, 0];
        }

        const daysUntilExpiration = diffInDays(today, lot.expirationDate);
        if (daysUntilExpiration > input.expirationWindowDays) {
          return [lot.id, 0];
        }

        const initialAvailable =
          startOfDay(lot.receivedDate) <= today ? Math.max(0, lot.quantityAvailable - lot.quantityAllocated) : 0;
        const projectedConsumptionBeforeExpiration = Math.min(
          initialAvailable,
          fullSimulation.consumedByLotId[lot.id] ?? 0
        );

        return [lot.id, Math.max(0, initialAvailable - projectedConsumptionBeforeExpiration)];
      })
    );
    const lotTrace = buildLotTrace({
      lots,
      consumedByLotId: fullSimulation.consumedByLotId,
      remainingByLotId: fullSimulation.remainingByLotId,
      today,
      projectedWasteByLotId
    });
    const shortageEvents = demandTrace
      .filter((entry) => entry.shortageQuantity > 0)
      .map((entry) => ({
        date: entry.date,
        sourceFinishedGoodItemId: entry.sourceFinishedGoodItemId,
        sourceFinishedGoodName: entry.sourceFinishedGoodName,
        shortageQuantity: entry.shortageQuantity
      }));
    const expiryRiskNotes = [
      ...(expiredQuantity > 0
        ? [
            `${formatNumber(expiredQuantity)} ${item.unitOfMeasure} is already expired and excluded from usable inventory.`
          ]
        : []),
      ...lotTrace
        .filter((lot) => lot.projectedWasteQuantity > 0)
        .map(
          (lot) =>
            `Lot ${lot.lotCode} is projected to waste ${formatNumber(lot.projectedWasteQuantity)} ${item.unitOfMeasure}.`
        )
    ];
    const projectedExpiryWaste = lotTrace.reduce((sum, lot) => sum + lot.projectedWasteQuantity, 0);

    const metrics: ItemPlanningMetrics = {
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      onHand,
      allocated,
      expiredQuantity,
      inbound,
      netAvailable,
      totalDemand,
      demandDuringLeadTime,
      reorderPoint,
      daysOfCover,
      projectedStockoutDate,
      projectedInventoryAtReceipt,
      shortageQuantity,
      blockedUntilReceipt,
      firstShortageDate
    };

    itemMetrics.push(metrics);
    itemTraces[item.id] = {
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      unitOfMeasure: item.unitOfMeasure,
      currentUsableInventory,
      inboundInventory,
      lotsInFefoOrder: lotTrace,
      projectedConsumption: demandTrace,
      shortageEvents,
      projectedExpiryWaste,
      firstShortageDate,
      reorderPoint,
      safetyStock: item.safetyStock
    };

    if (expiredQuantity > 0) {
      alerts.push({
        itemId: item.id,
        itemName: item.name,
        alertType: "EXPIRING_LOT",
        severity: "CRITICAL",
        message: `${item.name} has ${expiredQuantity.toFixed(2)} ${item.unitOfMeasure} in expired inventory that is excluded from planning availability.`
      });
    }

    if (item.category !== "FINISHED_GOOD" && blockedUntilReceipt) {
      alerts.push({
        itemId: item.id,
        itemName: item.name,
        alertType: "STOCKOUT_RISK",
        severity: "CRITICAL",
        message: `${item.name} is short ${formatNumber(shortageQuantity)} ${item.unitOfMeasure} before replenishment arrives. Planned production is blocked starting ${(firstShortageDate ?? today).toISOString().slice(0, 10)}.`,
        why: buildBlockedAlertWhy({
          itemName: item.name,
          unitOfMeasure: item.unitOfMeasure,
          currentUsableInventory,
          shortageQuantity,
          firstShortageDate,
          receiptDate,
          inboundInventory,
          datedDemand: demandTrace
        })
      });
    }

    const needsPurchaseAction =
      item.category !== "FINISHED_GOOD" && (netAvailable < reorderPoint || blockedUntilReceipt);

    if (needsPurchaseAction) {
      const rawQty = targetStockLevel - projectedInventoryAtReceipt;
      if (rawQty <= 0) {
        continue;
      }

      const recommendedQty = roundToOrderingConstraints(rawQty, item);
      const orderByTarget = firstShortageDate ?? projectedStockoutDate;
      const rawOrderByDate = orderByTarget ? addDays(orderByTarget, -item.leadTimeDays) : today;
      const orderByDate = rawOrderByDate < today ? today : rawOrderByDate;
      const gap = Math.max(0, reorderPoint - netAvailable);
      const urgency = orderByTarget ? Math.max(0, 30 - diffInDays(today, orderByTarget)) : 30;
      const priorityScore = Math.min(100, Math.round(gap * 10 + urgency * 2 + shortageQuantity * 10));
      const afterMoq = Math.max(Math.max(0, rawQty), item.minimumOrderQuantity > 0 ? item.minimumOrderQuantity : 0);

      recommendations.push({
        itemId: item.id,
        itemName: item.name,
        recommendedQty,
        orderByDate,
        reason:
          blockedUntilReceipt
            ? "Existing inbound supply arrives too late to cover demand before the next replenishment window."
            : netAvailable < 0
              ? "Negative projected net availability after allocations."
              : "Projected net availability falls below reorder point during supplier lead time.",
        priorityScore,
        explanation: {
          currentUsableInventory,
          inboundInventory,
          datedDemand: demandTrace,
          reorderPoint,
          safetyStock: item.safetyStock,
          demandDuringLeadTime,
          projectedInventoryAtReceipt,
          orderingAdjustment: {
            rawRequiredQty: rawQty,
            roundedQty: recommendedQty,
            roundedUpBy: recommendedQty - rawQty,
            minimumOrderQuantity: item.minimumOrderQuantity,
            orderMultiple: item.orderMultiple,
            moqApplied: item.minimumOrderQuantity > 0 && rawQty < item.minimumOrderQuantity,
            orderMultipleApplied: item.orderMultiple > 1 && recommendedQty !== afterMoq
          },
          expiryRiskInfluenced: expiryRiskNotes.length > 0,
          expiryRiskNotes
        }
      });

      if (!blockedUntilReceipt) {
        alerts.push({
          itemId: item.id,
          itemName: item.name,
          alertType: netAvailable <= 0 ? "STOCKOUT_RISK" : "REORDER",
          severity: calculateSeverity(priorityScore),
          message: `${item.name} is below reorder point. Net available ${netAvailable.toFixed(2)} ${item.unitOfMeasure}, reorder point ${reorderPoint.toFixed(2)} ${item.unitOfMeasure}.`
        });
      }
    }
  }

  const expiredLots = input.inventoryLots
    .map((lot) => {
      if (!lot.expirationDate || !isExpiredLot(lot.expirationDate, today)) {
        return null;
      }

      const item = itemById.get(lot.itemId);
      if (!item) {
        return null;
      }

      return {
        itemId: item.id,
        itemName: item.name,
        lotId: lot.id,
        lotCode: lot.lotCode,
        expirationDate: lot.expirationDate,
        daysExpired: Math.abs(diffInDays(today, lot.expirationDate)),
        quantityAvailable: lot.quantityAvailable
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const expiringLots = input.inventoryLots
    .map((lot) => {
      if (!lot.expirationDate || isExpiredLot(lot.expirationDate, today)) {
        return null;
      }

      const daysUntilExpiration = diffInDays(today, lot.expirationDate);
      if (daysUntilExpiration > input.expirationWindowDays) {
        return null;
      }

      const item = itemById.get(lot.itemId);
      if (!item) {
        return null;
      }

      const itemLots = input.inventoryLots.filter((candidate) => candidate.itemId === lot.itemId);
      const demandTimeline = demandTimelineByItemId[lot.itemId] ?? [];
      const purchaseReceipts = buildPurchaseReceiptEvents(input, lot.itemId);
      const horizonSimulation = simulateItemTimeline({
        today,
        endDate: horizonEnd,
        lots: itemLots,
        demandTimeline,
        purchaseReceipts
      });
      const initialAvailable = Math.max(0, lot.quantityAvailable - lot.quantityAllocated);
      const projectedConsumptionBeforeExpiration = Math.min(
        initialAvailable,
        horizonSimulation.consumedByLotId[lot.id] ?? 0
      );
      const projectedWasteQuantity = Math.max(
        0,
        initialAvailable - projectedConsumptionBeforeExpiration
      );

      return {
        itemId: item.id,
        itemName: item.name,
        lotId: lot.id,
        lotCode: lot.lotCode,
        expirationDate: lot.expirationDate,
        daysUntilExpiration,
        quantityAvailable: lot.quantityAvailable,
        projectedConsumptionBeforeExpiration,
        projectedWasteQuantity,
        fullyConsumedBeforeExpiration: projectedWasteQuantity === 0
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  for (const lot of expiringLots) {
    alerts.push({
      itemId: lot.itemId,
      itemName: lot.itemName,
      alertType: "EXPIRING_LOT",
      severity:
        lot.projectedWasteQuantity > 0 ? (lot.daysUntilExpiration <= 14 ? "HIGH" : "MEDIUM") : "LOW",
      message:
        lot.projectedWasteQuantity > 0
          ? `${lot.itemName} lot ${lot.lotCode} is projected to waste ${formatNumber(lot.projectedWasteQuantity)} before expiring in ${lot.daysUntilExpiration} days.`
          : `${lot.itemName} lot ${lot.lotCode} expires in ${lot.daysUntilExpiration} days but is projected to be fully consumed beforehand.`
    });
  }

  return {
    demandByItemId,
    demandTimelineByItemId,
    inventoryMetrics: itemMetrics.sort((left, right) => left.itemName.localeCompare(right.itemName)),
    itemTraces,
    recommendations: recommendations.sort((left, right) => right.priorityScore - left.priorityScore),
    alerts: alerts.sort((left, right) => {
      const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return rank[right.severity] - rank[left.severity];
    }),
    expiringLots,
    expiredLots
  };
}
