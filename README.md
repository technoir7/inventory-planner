# Inventory Planner MVP

Production-grade MVP inventory planning system for a skincare manufacturer. The app replaces spreadsheet-based planning with dependent-demand material planning driven by finished-good BOMs.

## Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Vitest for deterministic planning-engine unit tests

## Architecture

The application is split into three layers:

1. `prisma/schema.prisma`
   Defines the manufacturing data model for items, suppliers, BOMs, inventory lots, purchase orders, production plans, recommendations, and alerts.
2. `lib/planning/*`
   Pure planning engine that explodes BOM demand, nets inventory, calculates reorder points, predicts stockouts, rounds to MOQ/order multiple, and flags expiring lots.
3. `app/*`
   Server-rendered dashboard and tables plus JSON API routes for CRUD-style data access, dashboard outputs, recommendations, and CSV imports.

## Planning Logic

Inputs:

- 30-day production plan
- BOM formulas
- current inventory lots
- open purchase orders
- supplier lead times
- item safety stock

Core calculations:

- BOM explosion: converts finished-good plan quantities into dependent demand for raw materials and packaging
- Net available: `on_hand + inbound_purchase_orders - allocated_inventory`
- Reorder point: `time_phased_demand_during_lead_time + safety_stock`
- Recommendation trigger: create a recommendation when `net_available < reorder_point`
- Recommended quantity: `target_stock_level - projected_inventory_at_receipt`, then round up to MOQ and order multiple
- Expiration risk: alert on lots expiring within 60 days

Temporal planning behavior:

- Production plan lines can carry an optional `scheduledDate`; when present, demand is exploded onto that exact day.
- If `scheduledDate` is missing, the engine assumes demand occurs at the production plan `startDate` to avoid optimistic timing.
- Shortage detection is time-phased: late inbound supply can still trigger blocked-production alerts even when aggregate inventory looks sufficient over the full horizon.
- FEFO is used for projected lot consumption. Earlier-expiring lots are consumed first, and expiring-lot outputs include projected waste if known demand will not fully consume the lot before expiry.

## Pages

- `/` dashboard with critical alerts, recommended purchases, projected stockouts, and expiring lots
- `/inventory` inventory table with on-hand, allocations, net available, days of cover, and reorder point
- `/items/[itemId]` item-level planning trace with FEFO lots, dated consumption, blocked runs, and expiry waste
- `/products` finished-good BOMs with component usage
- `/recommendations` purchase recommendations with inspectable reasoning and order-quantity adjustments

## API Routes

- `GET/POST /api/items`
- `GET/POST /api/suppliers`
- `GET/POST /api/boms`
- `GET/POST /api/inventory-lots`
- `GET/POST /api/purchase-orders`
- `GET/POST /api/production-plans`
- `GET /api/recommendations`
- `GET /api/dashboard`
- `POST /api/import/[entity]`

CSV import entities:

- `items`
- `suppliers`
- `inventory-lots`
- `boms`
- `production-plans`

`/api/import/[entity]` expects `multipart/form-data` with a `file` field.

Expected CSV headers:

- `items`: `name,category,unit_of_measure,shelf_life_days,lead_time_days,minimum_order_quantity,order_multiple,cost_per_unit,organic_flag,safety_stock,default_supplier_name`
- `suppliers`: `name,contact,lead_time_days`
- `inventory-lots`: `item_name,lot_code,received_date,expiration_date,quantity_available,quantity_allocated`
- `boms`: `finished_good_name,batch_size,component_item_name,quantity_required,component_unit_of_measure`
- `production-plans`: `start_date,end_date,finished_good_name,quantity,scheduled_date`

## Seed Data

`prisma/seed.ts` loads a deterministic synthetic planning dataset built from the real component catalog already in the project:

- 10 base raw materials
- 3 base packaging components
- 5 synthetic finished goods: `Product_A`, `Product_B`, `Product_C`, `Product_D`, `Product_E`
- 2 suppliers
- deterministic inventory lots, including multi-lot FEFO cases and near-expiry lots
- open purchase orders with intentionally late arrivals
- a 30-day dated production plan with split runs for the same finished good

Synthetic product scenarios:

- `Product_A`: shared retinol demand with `Product_B`, plus bottle, pump, and carton usage
- `Product_B`: shared retinol demand and chamomile FEFO consumption
- `Product_C`: additional packaging pressure without using the retinol bottleneck
- `Product_D`: consumes the soon-expiring botanical powder lot, creating partial projected waste
- `Product_E`: later-horizon run that is saved by inbound supply arriving after earlier shortages

## Local Setup

Preferred flow:

```bash
npm run bootstrap
```

That command installs dependencies, creates `.env` from `.env.example` only when needed, runs Prisma setup, seeds the database, and then starts the dev server.

Manual flow:

1. Install dependencies:

```bash
npm install
```

2. Configure the database:

```bash
cp .env.example .env
```

3. Generate Prisma client and push the schema:

```bash
npm run prisma:generate
npm run prisma:push
```

4. Seed example data:

```bash
npm run seed
```

5. Start the app:

```bash
npm run dev
```

You can also run the setup portion without starting the app:

```bash
npm run setup
```

## Testing

Run the full verification loop with:

```bash
npm test
npx tsc --noEmit
npm run build
```

If you are typechecking from a completely clean workspace with no `.next/types` directory yet, run `npm run build` once first so Next.js can generate its route type stubs.

Test coverage focuses on business-critical planning and import logic. The suite is deterministic and currently covers:

- BOM explosion, batch-size scaling, repeated dated runs, and invalid BOM guards
- net available inventory with partial allocations
- reorder point and safety stock handling
- MOQ and order multiple rounding, including deterministic overbuy scenarios
- purchase recommendation generation for raw materials and packaging
- recommendation explanation integrity, so recommendation traces stay aligned with planner output
- finished-good exclusion from purchasing recommendations
- inbound purchase order treatment, including late inbound that still causes blocked production
- projected stockout timing and shortage detection
- FEFO lot consumption, fully-consumed expiring lots, and projected expiry waste
- blocked-production alert "why" traces and item-level planning inspection output
- expiring lot alerts and expired lot exclusion from usable inventory
- zero-demand behavior
- synthetic catalog scenarios for dated depletion, shared-component bottlenecks, late inbound rescue of later runs, and MOQ-driven overbuy pressure
- CSV parsing and validation for items, suppliers, lots, BOMs, and production plans
- missing supplier references, invalid categories, invalid dates, duplicate normalized names, inconsistent BOM data, scheduled-date validation, and optional UOM mismatch checks
- discount-tier purchasing helper behavior

Audit hardening notes:

- Expired lots are excluded from planning availability and raise critical alerts.
- Late inbound POs no longer suppress shortage detection when supply arrives after the replenishment window.
- CSV imports now validate normalized names and use case-insensitive, whitespace-tolerant matching for referenced items and suppliers.
- Production demand is now date-aware per production-plan line instead of only being treated as aggregate 30-day demand.
- Recommendations now include planner-owned explanation data: usable inventory, inbound by date, dated demand, reorder point, safety stock, MOQ/order-multiple adjustment, and expiry influence.
- Each item now exposes a planning trace showing FEFO lot order, lot-level projected waste, projected consumption by scheduled production line, and dated shortages.
- Blocked-production alerts now include a "why" explanation sourced from the same planner trace used for recommendations.

## Assumptions And Limitations

- BOM quantities are assumed to already be expressed in each component item's native `unitOfMeasure`. The engine does not perform unit conversion.
- The BOM CSV importer supports an optional `component_unit_of_measure` column and will fail fast on mismatches when provided. Persisted BOM records still store quantity only.
- Discount-tier purchasing is scaffolded in `lib/planning/purchasing.ts`, but discount tiers are not yet modeled in the Prisma schema or wired into the recommendation engine.
- Alternate suppliers are already supported through `SupplierItem`; no major schema refactor is required there.
- Substitute items are not yet modeled. The current schema can support them with an additive mapping layer (for example `ItemSubstitute` or `SubstitutionGroup`) without redesigning `Item`, `BOM`, or inventory tables.
- Projected expiry waste is based on known demand inside the current planning horizon. Demand beyond the 30-day plan is intentionally out of scope for that forecast.
- The seeded synthetic catalog is designed to stress the planning engine, not to model regulatory, batch-yield, labor-capacity, or campaign-scheduling constraints.
# inventory-planner
