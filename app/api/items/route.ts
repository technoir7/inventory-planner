import { ItemCategory, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function GET() {
  const items = await prisma.item.findMany({
    include: {
      defaultSupplier: true
    },
    orderBy: {
      name: "asc"
    }
  });

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();

  const item = await prisma.item.create({
    data: {
      name: body.name,
      category: body.category as ItemCategory,
      unitOfMeasure: body.unitOfMeasure,
      shelfLifeDays: body.shelfLifeDays ?? null,
      defaultSupplierId: body.defaultSupplierId ?? null,
      leadTimeDays: body.leadTimeDays ?? 0,
      minimumOrderQuantity: decimal(body.minimumOrderQuantity ?? 0),
      orderMultiple: decimal(body.orderMultiple ?? 1),
      costPerUnit: decimal(body.costPerUnit ?? 0),
      organicFlag: body.organicFlag ?? false,
      safetyStock: decimal(body.safetyStock ?? 0)
    }
  });

  return NextResponse.json(item, { status: 201 });
}
