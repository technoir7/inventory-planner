import Papa from "papaparse";
import { ItemCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CsvRow = Record<string, string>;

const ITEM_CATEGORIES = new Set(Object.values(ItemCategory));

export interface ImportRepository {
  findItemByNormalizedName(name: string): Promise<{ id: string; name: string; unitOfMeasure: string } | null>;
  findSupplierByNormalizedName(name: string): Promise<{ id: string; name: string } | null>;
  upsertItemByNormalizedName(input: {
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
  }): Promise<void>;
  upsertSupplierByNormalizedName(input: {
    name: string;
    contact: string | null;
    leadTimeDays: number;
  }): Promise<void>;
  createInventoryLot(input: {
    itemId: string;
    lotCode: string;
    receivedDate: Date;
    expirationDate: Date | null;
    quantityAvailable: number;
    quantityAllocated: number;
  }): Promise<void>;
  replaceBom(input: {
    finishedGoodItemId: string;
    batchSize: number;
    lines: Array<{ componentItemId: string; quantityRequired: number }>;
  }): Promise<void>;
  createProductionPlan(input: {
    startDate: Date;
    endDate: Date;
    lines: Array<{ finishedGoodItemId: string; quantity: number; scheduledDate: Date | null }>;
  }): Promise<void>;
}

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseCsv(text: string) {
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => error.message).join(", "));
  }

  return parsed.data;
}

function required(row: CsvRow, field: string) {
  const value = row[field]?.trim();
  if (!value) {
    throw new Error(`Missing required field "${field}".`);
  }

  return value;
}

function parseDate(value: string, field: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date field "${field}" with value "${value}".`);
  }

  return parsed;
}

function optionalDate(row: CsvRow, field: string) {
  const value = row[field]?.trim();
  return value ? parseDate(value, field) : null;
}

function numeric(row: CsvRow, field: string, fallback = 0) {
  const raw = row[field]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid numeric field "${field}" with value "${raw}".`);
  }

  return value;
}

function booleanish(row: CsvRow, field: string) {
  const value = row[field]?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function assertUniqueNormalizedValues(rows: CsvRow[], field: string, entityLabel: string) {
  const seen = new Map<string, string>();

  for (const row of rows) {
    const rawValue = required(row, field);
    const normalized = normalizeName(rawValue);
    const existing = seen.get(normalized);

    if (existing && existing !== rawValue) {
      throw new Error(
        `Duplicate ${entityLabel} "${rawValue}" conflicts with "${existing}" after normalization.`
      );
    }

    if (existing) {
      throw new Error(`Duplicate ${entityLabel} "${rawValue}" found in import file.`);
    }

    seen.set(normalized, rawValue);
  }
}

function parseCategory(row: CsvRow) {
  const category = required(row, "category") as ItemCategory;
  if (!ITEM_CATEGORIES.has(category)) {
    throw new Error(`Invalid category "${category}".`);
  }

  return category;
}

async function getItemByName(repository: ImportRepository, name: string) {
  const item = await repository.findItemByNormalizedName(name);
  if (!item) {
    throw new Error(`Item "${name}" was not found.`);
  }

  return item;
}

async function getItemIdByName(repository: ImportRepository, name: string) {
  const item = await getItemByName(repository, name);
  return item.id;
}

async function getSupplierIdByName(repository: ImportRepository, name: string) {
  const supplier = await repository.findSupplierByNormalizedName(name);
  if (!supplier) {
    throw new Error(`Supplier "${name}" was not found.`);
  }

  return supplier.id;
}

function createPrismaImportRepository(): ImportRepository {
  async function findNormalizedMatch<T extends { id: string; name: string }>(
    records: T[],
    name: string,
    label: string
  ) {
    const matches = records.filter((record) => normalizeName(record.name) === normalizeName(name));
    if (matches.length > 1) {
      throw new Error(`Multiple ${label} records match "${name}" after normalization.`);
    }

    return matches[0] ?? null;
  }

  return {
    async findItemByNormalizedName(name) {
      const items = await prisma.item.findMany({
        select: {
          id: true,
          name: true,
          unitOfMeasure: true
        }
      });

      return findNormalizedMatch(items, name, "item");
    },
    async findSupplierByNormalizedName(name) {
      const suppliers = await prisma.supplier.findMany({
        select: {
          id: true,
          name: true
        }
      });

      return findNormalizedMatch(suppliers, name, "supplier");
    },
    async upsertItemByNormalizedName(input) {
      const existing = await this.findItemByNormalizedName(input.name);
      const data = {
        name: input.name,
        category: input.category,
        unitOfMeasure: input.unitOfMeasure,
        shelfLifeDays: input.shelfLifeDays,
        leadTimeDays: input.leadTimeDays,
        minimumOrderQuantity: decimal(input.minimumOrderQuantity),
        orderMultiple: decimal(input.orderMultiple),
        costPerUnit: decimal(input.costPerUnit),
        organicFlag: input.organicFlag,
        safetyStock: decimal(input.safetyStock),
        defaultSupplierId: input.defaultSupplierId
      };

      if (existing) {
        await prisma.item.update({
          where: { id: existing.id },
          data
        });
        return;
      }

      await prisma.item.create({ data });
    },
    async upsertSupplierByNormalizedName(input) {
      const existing = await this.findSupplierByNormalizedName(input.name);
      const data = {
        name: input.name,
        contact: input.contact,
        leadTimeDays: input.leadTimeDays
      };

      if (existing) {
        await prisma.supplier.update({
          where: { id: existing.id },
          data
        });
        return;
      }

      await prisma.supplier.create({ data });
    },
    async createInventoryLot(input) {
      await prisma.inventoryLot.create({
        data: {
          itemId: input.itemId,
          lotCode: input.lotCode,
          receivedDate: input.receivedDate,
          expirationDate: input.expirationDate,
          quantityAvailable: decimal(input.quantityAvailable),
          quantityAllocated: decimal(input.quantityAllocated)
        }
      });
    },
    async replaceBom(input) {
      await prisma.$transaction(async (tx) => {
        const bom = await tx.bOM.upsert({
          where: { finishedGoodItemId: input.finishedGoodItemId },
          update: {
            batchSize: decimal(input.batchSize)
          },
          create: {
            finishedGoodItemId: input.finishedGoodItemId,
            batchSize: decimal(input.batchSize)
          }
        });

        await tx.bOMLine.deleteMany({ where: { bomId: bom.id } });

        for (const line of input.lines) {
          await tx.bOMLine.create({
            data: {
              bomId: bom.id,
              componentItemId: line.componentItemId,
              quantityRequired: decimal(line.quantityRequired)
            }
          });
        }
      });
    },
    async createProductionPlan(input) {
      await prisma.$transaction(async (tx) => {
        const plan = await tx.productionPlan.create({
          data: {
            startDate: input.startDate,
            endDate: input.endDate
          }
        });

        for (const line of input.lines) {
          await tx.productionPlanLine.create({
            data: {
              productionPlanId: plan.id,
              finishedGoodItemId: line.finishedGoodItemId,
              scheduledDate: line.scheduledDate,
              quantity: decimal(line.quantity)
            } as never
          });
        }
      });
    }
  };
}

export function createImportService(repository: ImportRepository) {
  return {
    async importItemsCsv(text: string) {
      const rows = parseCsv(text);
      assertUniqueNormalizedValues(rows, "name", "item");

      for (const row of rows) {
        const defaultSupplierId = row.default_supplier_name
          ? await getSupplierIdByName(repository, required(row, "default_supplier_name"))
          : null;

        await repository.upsertItemByNormalizedName({
          name: required(row, "name"),
          category: parseCategory(row),
          unitOfMeasure: required(row, "unit_of_measure"),
          shelfLifeDays: row.shelf_life_days ? numeric(row, "shelf_life_days") : null,
          leadTimeDays: numeric(row, "lead_time_days"),
          minimumOrderQuantity: numeric(row, "minimum_order_quantity"),
          orderMultiple: numeric(row, "order_multiple", 1),
          costPerUnit: numeric(row, "cost_per_unit"),
          organicFlag: booleanish(row, "organic_flag"),
          safetyStock: numeric(row, "safety_stock"),
          defaultSupplierId
        });
      }

      return { imported: rows.length };
    },
    async importSuppliersCsv(text: string) {
      const rows = parseCsv(text);
      assertUniqueNormalizedValues(rows, "name", "supplier");

      for (const row of rows) {
        await repository.upsertSupplierByNormalizedName({
          name: required(row, "name"),
          contact: row.contact?.trim() || null,
          leadTimeDays: numeric(row, "lead_time_days")
        });
      }

      return { imported: rows.length };
    },
    async importInventoryLotsCsv(text: string) {
      const rows = parseCsv(text);

      for (const row of rows) {
        const receivedDate = parseDate(required(row, "received_date"), "received_date");
        const expirationDate = optionalDate(row, "expiration_date");
        if (expirationDate && expirationDate < receivedDate) {
          throw new Error("expiration_date cannot be earlier than received_date.");
        }

        await repository.createInventoryLot({
          itemId: await getItemIdByName(repository, required(row, "item_name")),
          lotCode: required(row, "lot_code"),
          receivedDate,
          expirationDate,
          quantityAvailable: numeric(row, "quantity_available"),
          quantityAllocated: numeric(row, "quantity_allocated")
        });
      }

      return { imported: rows.length };
    },
    async importBomCsv(text: string) {
      const rows = parseCsv(text);
      const grouped = new Map<string, CsvRow[]>();

      for (const row of rows) {
        const key = normalizeName(required(row, "finished_good_name"));
        const list = grouped.get(key) ?? [];
        list.push(row);
        grouped.set(key, list);
      }

      for (const entries of grouped.values()) {
        const finishedGoodName = required(entries[0], "finished_good_name");
        assertUniqueNormalizedValues(entries, "component_item_name", `BOM component for ${finishedGoodName}`);
        const batchSize = numeric(entries[0], "batch_size", 1);
        if (entries.some((row) => numeric(row, "batch_size", 1) !== batchSize)) {
          throw new Error(`BOM "${finishedGoodName}" contains inconsistent batch_size values.`);
        }

        await repository.replaceBom({
          finishedGoodItemId: await getItemIdByName(repository, finishedGoodName),
          batchSize,
          lines: await Promise.all(
            entries.map(async (row) => {
              const componentItem = await getItemByName(repository, required(row, "component_item_name"));
              const componentUnit = row.component_unit_of_measure?.trim();
              if (componentUnit && componentUnit !== componentItem.unitOfMeasure) {
                throw new Error(
                  `Unit mismatch for component "${componentItem.name}": expected ${componentItem.unitOfMeasure}, received ${componentUnit}.`
                );
              }

              return {
                componentItemId: componentItem.id,
                quantityRequired: numeric(row, "quantity_required")
              };
            })
          )
        });
      }

      return { imported: rows.length };
    },
    async importProductionPlanCsv(text: string) {
      const rows = parseCsv(text);
      const grouped = new Map<string, CsvRow[]>();

      for (const row of rows) {
        const startDate = required(row, "start_date");
        const endDate = required(row, "end_date");
        const key = `${startDate}:${endDate}`;
        const list = grouped.get(key) ?? [];
        list.push(row);
        grouped.set(key, list);
      }

      for (const [key, entries] of grouped.entries()) {
        const [startDateRaw, endDateRaw] = key.split(":");
        const startDate = parseDate(startDateRaw, "start_date");
        const endDate = parseDate(endDateRaw, "end_date");
        if (endDate < startDate) {
          throw new Error("end_date cannot be earlier than start_date.");
        }

        await repository.createProductionPlan({
          startDate,
          endDate,
          lines: await Promise.all(
            entries.map(async (row) => {
              const scheduledDate = row.scheduled_date
                ? parseDate(required(row, "scheduled_date"), "scheduled_date")
                : null;
              if (scheduledDate && (scheduledDate < startDate || scheduledDate > endDate)) {
                throw new Error("scheduled_date must fall inside the production plan window.");
              }

              return {
                finishedGoodItemId: await getItemIdByName(repository, required(row, "finished_good_name")),
                quantity: numeric(row, "quantity"),
                scheduledDate
              };
            })
          )
        });
      }

      return { imported: rows.length };
    },
    async importCsv(entity: string, text: string) {
      switch (entity) {
        case "items":
          return this.importItemsCsv(text);
        case "suppliers":
          return this.importSuppliersCsv(text);
        case "inventory-lots":
          return this.importInventoryLotsCsv(text);
        case "boms":
          return this.importBomCsv(text);
        case "production-plans":
          return this.importProductionPlanCsv(text);
        default:
          throw new Error(`Unsupported import entity "${entity}".`);
      }
    }
  };
}

const defaultImportService = createImportService(createPrismaImportRepository());

export const importItemsCsv = defaultImportService.importItemsCsv.bind(defaultImportService);
export const importSuppliersCsv = defaultImportService.importSuppliersCsv.bind(defaultImportService);
export const importInventoryLotsCsv = defaultImportService.importInventoryLotsCsv.bind(defaultImportService);
export const importBomCsv = defaultImportService.importBomCsv.bind(defaultImportService);
export const importProductionPlanCsv = defaultImportService.importProductionPlanCsv.bind(defaultImportService);
export const importCsv = defaultImportService.importCsv.bind(defaultImportService);
