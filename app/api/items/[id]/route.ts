import { ItemCategory, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const item = await prisma.item.findUnique({
    where: { id: params.id },
    include: { defaultSupplier: true, supplierItems: true }
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();

  try {
    const item = await prisma.item.update({
      where: { id: params.id },
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

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.item.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
}
