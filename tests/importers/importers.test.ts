import { describe, expect, it } from "vitest";
import { ItemCategory } from "@prisma/client";
import { createImportService, ImportRepository, normalizeName, parseCsv } from "@/lib/importers";

type FakeState = {
  items: Array<{
    id: string;
    name: string;
    category: ItemCategory;
    unitOfMeasure: string;
    shelfLifeDays: number | null;
    leadTimeDays: number;
    minimumOrderQuantity: number;
    orderMultiple: number;
    costPerUnit: number;
    organicFlag: boolean;
    safetyStock: number;
    defaultSupplierId: string | null;
  }>;
  suppliers: Array<{ id: string; name: string; contact: string | null; leadTimeDays: number }>;
  inventoryLots: Array<{
    itemId: string;
    lotCode: string;
    receivedDate: Date;
    expirationDate: Date | null;
    quantityAvailable: number;
    quantityAllocated: number;
  }>;
  boms: Array<{
    finishedGoodItemId: string;
    batchSize: number;
    lines: Array<{ componentItemId: string; quantityRequired: number }>;
  }>;
  productionPlans: Array<{
    startDate: Date;
    endDate: Date;
    lines: Array<{ finishedGoodItemId: string; quantity: number; scheduledDate: Date | null }>;
  }>;
};

function createFakeRepository(seed?: Partial<FakeState>) {
  const state: FakeState = {
    items: seed?.items ?? [],
    suppliers: seed?.suppliers ?? [],
    inventoryLots: seed?.inventoryLots ?? [],
    boms: seed?.boms ?? [],
    productionPlans: seed?.productionPlans ?? []
  };

  let idCounter = 1;
  const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

  const repository: ImportRepository = {
    async findItemByNormalizedName(name) {
      const matches = state.items.filter((item) => normalizeName(item.name) === normalizeName(name));
      if (matches.length > 1) {
        throw new Error(`Multiple item records match "${name}" after normalization.`);
      }

      const match = matches[0];
      return match ? { id: match.id, name: match.name, unitOfMeasure: match.unitOfMeasure } : null;
    },
    async findSupplierByNormalizedName(name) {
      const matches = state.suppliers.filter((supplier) => normalizeName(supplier.name) === normalizeName(name));
      if (matches.length > 1) {
        throw new Error(`Multiple supplier records match "${name}" after normalization.`);
      }

      const match = matches[0];
      return match ? { id: match.id, name: match.name } : null;
    },
    async upsertItemByNormalizedName(input) {
      const existing = state.items.find((item) => normalizeName(item.name) === normalizeName(input.name));
      if (existing) {
        Object.assign(existing, input);
        return;
      }

      state.items.push({
        id: nextId("item"),
        ...input
      });
    },
    async upsertSupplierByNormalizedName(input) {
      const existing = state.suppliers.find((supplier) => normalizeName(supplier.name) === normalizeName(input.name));
      if (existing) {
        Object.assign(existing, input);
        return;
      }

      state.suppliers.push({
        id: nextId("sup"),
        ...input
      });
    },
    async createInventoryLot(input) {
      state.inventoryLots.push(input);
    },
    async replaceBom(input) {
      const existingIndex = state.boms.findIndex((bom) => bom.finishedGoodItemId === input.finishedGoodItemId);
      if (existingIndex >= 0) {
        state.boms[existingIndex] = input;
        return;
      }

      state.boms.push(input);
    },
    async createProductionPlan(input) {
      state.productionPlans.push(input);
    }
  };

  return { repository, state };
}

describe("importers", () => {
  it("parses CSV headers with whitespace", () => {
    const rows = parseCsv(" name , category \nRetinol,RAW_MATERIAL\n");
    expect(rows).toEqual([{ name: "Retinol", category: "RAW_MATERIAL" }]);
  });

  it("imports items with null shelf life and case-insensitive supplier lookup", async () => {
    const { repository, state } = createFakeRepository({
      suppliers: [{ id: "sup-1", name: "Botanical Extracts Co.", contact: null, leadTimeDays: 10 }]
    });
    const service = createImportService(repository);

    const result = await service.importItemsCsv(
      [
        "name,category,unit_of_measure,shelf_life_days,lead_time_days,minimum_order_quantity,order_multiple,cost_per_unit,organic_flag,safety_stock,default_supplier_name",
        "Retinol,RAW_MATERIAL,ml,,12,25,5,1.95,yes,8, botanical extracts co. "
      ].join("\n")
    );

    expect(result).toEqual({ imported: 1 });
    expect(state.items[0]).toMatchObject({
      name: "Retinol",
      shelfLifeDays: null,
      defaultSupplierId: "sup-1",
      organicFlag: true
    });
  });

  it("rejects duplicate or inconsistent item naming within a CSV", async () => {
    const { repository } = createFakeRepository();
    const service = createImportService(repository);

    await expect(
      service.importItemsCsv(
        [
          "name,category,unit_of_measure,shelf_life_days,lead_time_days,minimum_order_quantity,order_multiple,cost_per_unit,organic_flag,safety_stock,default_supplier_name",
          "Retinol,RAW_MATERIAL,ml,,12,25,5,1.95,no,8,",
          " retinol ,RAW_MATERIAL,ml,,12,25,5,1.95,no,8,"
        ].join("\n")
      )
    ).rejects.toThrow(/Duplicate item/i);
  });

  it("rejects missing supplier references and invalid categories", async () => {
    const { repository } = createFakeRepository();
    const service = createImportService(repository);

    await expect(
      service.importItemsCsv(
        [
          "name,category,unit_of_measure,shelf_life_days,lead_time_days,minimum_order_quantity,order_multiple,cost_per_unit,organic_flag,safety_stock,default_supplier_name",
          "Retinol,INVALID,ml,,12,25,5,1.95,no,8,"
        ].join("\n")
      )
    ).rejects.toThrow('Invalid category "INVALID"');

    await expect(
      service.importItemsCsv(
        [
          "name,category,unit_of_measure,shelf_life_days,lead_time_days,minimum_order_quantity,order_multiple,cost_per_unit,organic_flag,safety_stock,default_supplier_name",
          "Retinol,RAW_MATERIAL,ml,,12,25,5,1.95,no,8,Unknown Supplier"
        ].join("\n")
      )
    ).rejects.toThrow('Supplier "Unknown Supplier" was not found.');
  });

  it("imports inventory lots and validates dates", async () => {
    const { repository, state } = createFakeRepository({
      items: [
        {
          id: "item-1",
          name: "Retinol",
          category: ItemCategory.RAW_MATERIAL,
          unitOfMeasure: "ml",
          shelfLifeDays: 365,
          leadTimeDays: 10,
          minimumOrderQuantity: 25,
          orderMultiple: 5,
          costPerUnit: 1.95,
          organicFlag: false,
          safetyStock: 8,
          defaultSupplierId: null
        }
      ]
    });
    const service = createImportService(repository);

    await service.importInventoryLotsCsv(
      [
        "item_name,lot_code,received_date,expiration_date,quantity_available,quantity_allocated",
        " retinol ,RET-001,2026-03-01,2026-05-01,10,3"
      ].join("\n")
    );

    expect(state.inventoryLots[0]).toMatchObject({
      itemId: "item-1",
      quantityAvailable: 10,
      quantityAllocated: 3
    });

    await expect(
      service.importInventoryLotsCsv(
        [
          "item_name,lot_code,received_date,expiration_date,quantity_available,quantity_allocated",
          "Retinol,RET-002,2026-03-10,2026-03-01,10,0"
        ].join("\n")
      )
    ).rejects.toThrow("expiration_date cannot be earlier than received_date.");
  });

  it("imports BOMs using normalized item names and validates optional units", async () => {
    const { repository, state } = createFakeRepository({
      items: [
        {
          id: "fg-1",
          name: "Night Renewal Serum",
          category: ItemCategory.FINISHED_GOOD,
          unitOfMeasure: "ea",
          shelfLifeDays: null,
          leadTimeDays: 0,
          minimumOrderQuantity: 0,
          orderMultiple: 1,
          costPerUnit: 0,
          organicFlag: false,
          safetyStock: 0,
          defaultSupplierId: null
        },
        {
          id: "rm-1",
          name: "Retinol",
          category: ItemCategory.RAW_MATERIAL,
          unitOfMeasure: "ml",
          shelfLifeDays: 365,
          leadTimeDays: 10,
          minimumOrderQuantity: 25,
          orderMultiple: 5,
          costPerUnit: 1.95,
          organicFlag: false,
          safetyStock: 8,
          defaultSupplierId: null
        },
        {
          id: "rm-2",
          name: "Niacinamide",
          category: ItemCategory.RAW_MATERIAL,
          unitOfMeasure: "g",
          shelfLifeDays: 365,
          leadTimeDays: 10,
          minimumOrderQuantity: 25,
          orderMultiple: 5,
          costPerUnit: 1.95,
          organicFlag: false,
          safetyStock: 8,
          defaultSupplierId: null
        }
      ]
    });
    const service = createImportService(repository);

    await service.importBomCsv(
      [
        "finished_good_name,batch_size,component_item_name,quantity_required,component_unit_of_measure",
        " night renewal serum ,1, retinol ,0.5,ml"
      ].join("\n")
    );

    expect(state.boms[0]).toMatchObject({
      finishedGoodItemId: "fg-1",
      batchSize: 1
    });

    await expect(
      service.importBomCsv(
        [
          "finished_good_name,batch_size,component_item_name,quantity_required,component_unit_of_measure",
          "Night Renewal Serum,1,Retinol,0.5,g"
        ].join("\n")
      )
    ).rejects.toThrow(/Unit mismatch for component "Retinol"/);

    await expect(
      service.importBomCsv(
        [
          "finished_good_name,batch_size,component_item_name,quantity_required",
          "Night Renewal Serum,1,Retinol,0.5",
          "Night Renewal Serum,2,Niacinamide,0.25"
        ].join("\n")
      )
    ).rejects.toThrow(/inconsistent batch_size/i);
  });

  it("imports production plans with scheduled dates and validates date windows", async () => {
    const { repository, state } = createFakeRepository({
      items: [
        {
          id: "fg-1",
          name: "Night Renewal Serum",
          category: ItemCategory.FINISHED_GOOD,
          unitOfMeasure: "ea",
          shelfLifeDays: null,
          leadTimeDays: 0,
          minimumOrderQuantity: 0,
          orderMultiple: 1,
          costPerUnit: 0,
          organicFlag: false,
          safetyStock: 0,
          defaultSupplierId: null
        }
      ]
    });
    const service = createImportService(repository);

    await service.importProductionPlanCsv(
      [
        "start_date,end_date,finished_good_name,quantity,scheduled_date",
        "2026-03-01,2026-03-31, night renewal serum ,120,2026-03-18"
      ].join("\n")
    );

    expect(state.productionPlans[0]?.lines[0]).toMatchObject({
      finishedGoodItemId: "fg-1",
      quantity: 120,
      scheduledDate: new Date("2026-03-18T00:00:00.000Z")
    });

    await expect(
      service.importProductionPlanCsv(
        [
          "start_date,end_date,finished_good_name,quantity,scheduled_date",
          "2026-03-01,2026-03-31,Night Renewal Serum,120,2026-04-01"
        ].join("\n")
      )
    ).rejects.toThrow("scheduled_date must fall inside the production plan window.");
  });

  it("rejects unsupported entities", async () => {
    const { repository } = createFakeRepository();
    const service = createImportService(repository);

    await expect(service.importCsv("unknown", "foo,bar\n")).rejects.toThrow('Unsupported import entity "unknown".');
  });
});
