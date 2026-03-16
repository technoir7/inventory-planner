# LLM_CONTEXT

## 1. Project Purpose

- Production-grade MVP inventory planning system for a skincare manufacturer.
- Replaces spreadsheet-based planning with dependent-demand material planning.
- Tracks raw materials, packaging, finished goods, formulas/BOMs, lots, suppliers, purchase orders, and production plans.
- Computes time-phased shortages, projected stockouts, expiry risk, and purchase recommendations.
- Includes inspectable planner traces so operators can see why a recommendation or blocked-production alert exists.

## 2. Tech Stack

- Next.js 14 App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Vitest
- Server-rendered pages + Next API routes

## 3. Core Domain Model

### Item

- Categories: `RAW_MATERIAL`, `PACKAGING`, `FINISHED_GOOD`
- Fields used by planner:
  - `unitOfMeasure`
  - `leadTimeDays`
  - `minimumOrderQuantity`
  - `orderMultiple`
  - `costPerUnit`
  - `safetyStock`
  - `shelfLifeDays`
  - `defaultSupplierId`

### Supplier / SupplierItem

- `Supplier` stores vendor metadata and default lead time.
- `SupplierItem` maps alternate supplier-item sourcing and cost/MOQ.
- Current planner mainly uses item lead time + item ordering parameters.

### BOM / BOMLine

- `BOM.finishedGoodItemId` -> finished good item.
- `BOM.batchSize` scales production line quantities.
- `BOMLine.componentItemId` -> raw material or packaging component.
- `BOMLine.quantityRequired` is assumed to already be in the component item’s native UOM.

### InventoryLot

- Lot-level inventory with:
  - `receivedDate`
  - `expirationDate`
  - `quantityAvailable`
  - `quantityAllocated`
- Planner excludes expired lots from usable inventory.
- Planner consumes lots using FEFO.

### PurchaseOrder / PurchaseOrderLine

- Open inbound supply (`OPEN`, `PARTIALLY_RECEIVED`) contributes future receipt events.
- Arrival date matters; late inbound can still leave early runs blocked.

### ProductionPlan / ProductionPlanLine

- Production plan window plus line-level `scheduledDate`.
- Planner explodes demand onto each line’s scheduled date.
- If `scheduledDate` is missing, planner falls back to plan `startDate`.

### Recommendation / Alert

- Prisma models exist.
- Runtime planner returns recommendations/alerts in memory via `runPlanningEngine`.
- UI currently reads live planner output from DB snapshot service, not persisted recommendation records.

## 4. Planning Engine

### Entry Point

- `lib/planning/engine.ts`
- Main function: `runPlanningEngine(input: PlanningInput): PlanningResult`

### BOM Explosion

- `explodeBomDemandByDate`:
  - finds BOM by finished good
  - scales component demand by `productionLine.quantity / bom.batchSize`
  - emits dated demand per component item
- `explodeBomDemand` aggregates dated demand totals by item

### Time-Phased Demand

- Demand is not treated as a single 30-day aggregate.
- Each production line creates dated component demand events.
- Shortage detection is based on event timing vs receipts, not just total net availability.

### FEFO Consumption

- `simulateItemTimeline` maintains lot states over time.
- Active lots sorted by:
  1. earliest expiration
  2. earliest receipt date
- Receipts are inserted before demand events on the same date.
- Demand fulfillment records lot-level consumption for explainability.

### Net / Usable Inventory

- Planner computes:
  - `onHand`: usable received non-expired lot quantity
  - `allocated`: sum of lot allocations
  - `currentUsableInventory`: sum of `max(0, available - allocated)` for usable lots
  - `inbound`: open PO quantity only
  - `netAvailable = onHand + inbound - allocated`
- Expired lots contribute to `expiredQuantity`, not usable supply.

### Reorder Logic

- `receiptDate = today + leadTimeDays`
- `demandDuringLeadTime = dated demand with event.date <= receiptDate`
- `reorderPoint = demandDuringLeadTime + safetyStock`
- Purchase action if:
  - `netAvailable < reorderPoint`
  - OR `blockedUntilReceipt === true`

### Shortage / Blocked Production Logic

- Planner simulates supply/demand to:
  - horizon end
  - next receipt window (`today + leadTimeDays`)
- `shortageQuantity` and `firstShortageDate` come from simulation through next receipt window.
- `blockedUntilReceipt` is true when dated demand cannot be fulfilled before the replenishment window.
- Critical stockout alerts are raised for blocked items.

### Purchase Recommendation Logic

- `targetStockLevel = totalDemand + safetyStock`
- `rawQty = targetStockLevel - projectedInventoryAtReceipt`
- Skip recommendation if `rawQty <= 0`
- `roundToOrderingConstraints`:
  - applies MOQ floor
  - rounds up to order multiple
- `orderByDate`:
  - based on shortage date or projected stockout date minus lead time
  - clamped to `today`

### Expiry Simulation

- Expired lots:
  - excluded from usable inventory
  - generate critical alerts
- Expiring lots:
  - evaluated within `expirationWindowDays`
  - projected consumption before expiration derived from FEFO simulation
  - projected waste = starting usable quantity not consumed before expiry
- Alerts distinguish:
  - projected full consumption before expiry
  - projected waste before expiry

## 5. Explainability

### Recommendation Explanation

- `PlanningRecommendation.explanation` includes:
  - `currentUsableInventory`
  - `inboundInventory[]`
  - `datedDemand[]`
  - `reorderPoint`
  - `safetyStock`
  - `demandDuringLeadTime`
  - `projectedInventoryAtReceipt`
  - `orderingAdjustment`
  - `expiryRiskInfluenced`
  - `expiryRiskNotes[]`

### Dated Demand Trace

- Each demand trace entry includes:
  - date
  - source finished good id/name
  - demand quantity
  - fulfilled quantity
  - shortage quantity
  - `insideLeadTimeWindow`
  - `beforeNextReceiptWindow`
  - `lotConsumptions[]`

### Item Trace

- `PlanningResult.itemTraces[itemId]` exposes:
  - `currentUsableInventory`
  - inbound receipts by date
  - lots in FEFO order
  - projected consumption by production line
  - shortage events
  - projected expiry waste
  - first shortage date
  - reorder point
  - safety stock

### Alert Why

- `PlanningAlert.why` currently attached to blocked-production stockout alerts.
- Includes:
  - summary
  - current usable inventory
  - shortage quantity
  - first shortage date
  - receipt date
  - inbound inventory
  - relevant dated demand

## 6. Synthetic Dataset

### Purpose

- Deterministic fake finished-goods catalog derived from real component items.
- Used for stress-testing planner behavior without proprietary product formulas.

### Synthetic Finished Goods

- `Product_A`
  - uses `Retinol`, `Carrier Oil`, `Preservative Blend`, `Airless Bottle`, `Treatment Pump`, `Folding Carton`
- `Product_B`
  - uses `Retinol`, `Aloe Concentrate`, `Chamomile Extract`, packaging
- `Product_C`
  - uses `Hyaluronic Acid`, `Niacinamide`, `Carrier Oil`, packaging
- `Product_D`
  - uses `Shea Butter`, `Chamomile Extract`, `Botanical Powder Blend`, packaging
- `Product_E`
  - uses `Aloe Concentrate`, `Lavender Essential Oil`, `Preservative Blend`, packaging

### Scenarios Covered

- shared raw-material bottleneck on `Retinol`
- packaging bottleneck on `Folding Carton`
- multiple dated runs for same FG
- FEFO across multi-lot `Chamomile Extract`
- near-expiry lot fully consumed before expiry
- near-expiry lot partially wasted (`Botanical Powder Blend`)
- late inbound PO rescues later runs but not earlier ones
- MOQ / order-multiple overbuy pressure

### Seed Integration

- `prisma/seed.ts` seeds:
  - 10 raw materials
  - 3 packaging items
  - 5 synthetic finished goods
  - synthetic lots
  - synthetic POs
  - synthetic dated production plan

## 7. Test Coverage

- BOM explosion and batch-size scaling
- repeated dated runs for same finished good
- invalid planning input guards
- net available with partial allocations
- reorder point and safety stock handling
- MOQ and order-multiple rounding
- purchase recommendation generation
- finished-good exclusion from purchasing recommendations
- late inbound handling and blocked production detection
- projected stockout timing
- FEFO lot consumption order
- expiring vs expired lot behavior
- projected expiry waste
- zero-demand behavior
- CSV import parsing/validation
- duplicate normalized naming / case-insensitive matching
- scheduled-date validation
- optional BOM UOM mismatch validation
- synthetic dataset scenario validation
- explanation integrity:
  - recommendation explanation matches planner math
  - item trace matches shortage/receipt behavior
  - blocked alert `why` matches planner trace

## 8. UI Surface

### Pages

- `/`
  - dashboard
  - critical alerts
  - recommended purchases
  - projected stockouts
  - expiring inventory
- `/inventory`
  - inventory position table
  - item links into trace view
- `/products`
  - finished-good BOM display
- `/recommendations`
  - inspectable recommendation cards
  - inbound by date
  - dated demand
  - reorder/safety stock
  - MOQ/order-multiple adjustment
  - expiry influence notes
- `/items/[itemId]`
  - planning trace view
  - FEFO lot order
  - projected consumption by production line
  - shortage dates
  - expiry waste
  - alert why

### APIs

- `GET/POST /api/items`
- `GET/POST /api/suppliers`
- `GET/POST /api/boms`
- `GET/POST /api/inventory-lots`
- `GET/POST /api/purchase-orders`
- `GET/POST /api/production-plans`
- `GET /api/recommendations`
- `GET /api/dashboard`
- `POST /api/import/[entity]`

## 9. Import System

### Supported CSV Entities

- `items`
- `suppliers`
- `inventory-lots`
- `boms`
- `production-plans`

### Behavior

- Implemented in `lib/importers.ts`
- Uses repository abstraction for testability
- Normalizes names case-insensitively with whitespace tolerance
- Detects duplicate normalized item names
- Validates categories and dates
- Resolves references to items/suppliers by normalized name
- BOM import supports optional `component_unit_of_measure`
  - if present and mismatched, import fails fast
- Production plan import supports `scheduled_date`

## 10. Current Limitations

- No unit conversion; BOM quantities must already match item native UOM.
- Discount-tier purchasing helper exists but is not modeled in Prisma or wired into planner recommendations.
- Substitute items are not modeled yet.
- Alternate suppliers exist through `SupplierItem`, but planner does not optimize sourcing across suppliers.
- No labor/capacity scheduling.
- No campaign planning / batch sequencing constraints.
- No regulatory/quality workflow.
- Projected expiry waste only considers demand inside current planning horizon.
- Runtime recommendations/alerts are computed on demand; persistence models are not yet the primary read path.
- Some `scheduledDate` DB writes are cast (`as never`) because generated Prisma client types have lagged schema changes in this workspace.
- `npx tsc --noEmit` may need a prior `npm run build` in a clean workspace so `.next/types` exists.

## 11. Key Files

### Planning / Domain

- `lib/planning/engine.ts`
- `lib/planning/types.ts`
- `lib/planning/service.ts`
- `lib/planning/synthetic-dataset.ts`
- `lib/planning/purchasing.ts`

### Persistence

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `lib/prisma.ts`

### UI

- `app/page.tsx`
- `app/inventory/page.tsx`
- `app/products/page.tsx`
- `app/recommendations/page.tsx`
- `app/items/[itemId]/page.tsx`
- `components/table.tsx`
- `components/section-card.tsx`
- `components/metric-card.tsx`
- `components/nav.tsx`

### Imports / APIs / Tests

- `lib/importers.ts`
- `app/api/import/[entity]/route.ts`
- `tests/planning/engine.test.ts`
- `tests/planning/synthetic-dataset.test.ts`
- `tests/importers/importers.test.ts`
- `README.md`

## 12. Dev Workflow

### Install / Run

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:push
npm run seed
npm run dev
```

### Verification

```bash
npm test
npx tsc --noEmit
npm run build
```

### Notes

- If `.next/types` does not exist yet, run `npm run build` once before `npx tsc --noEmit`.
- Seed data is synthetic and deterministic.
- Planner logic is intended to stay deterministic and unit-testable.
