import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const lot = await prisma.inventoryLot.findUnique({
    where: { id: params.id },
    include: { item: true }
  });

  if (!lot) {
    return NextResponse.json({ error: "Inventory lot not found" }, { status: 404 });
  }

  return NextResponse.json(lot);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();

  try {
    const lot = await prisma.inventoryLot.update({
      where: { id: params.id },
      data: {
        itemId: body.itemId,
        lotCode: body.lotCode,
        receivedDate: new Date(body.receivedDate),
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
        quantityAvailable: decimal(body.quantityAvailable ?? 0),
        quantityAllocated: decimal(body.quantityAllocated ?? 0)
      }
    });

    return NextResponse.json(lot);
  } catch {
    return NextResponse.json({ error: "Inventory lot not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.inventoryLot.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Inventory lot not found" }, { status: 404 });
  }
}
