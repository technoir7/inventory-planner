import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function GET() {
  const lots = await prisma.inventoryLot.findMany({
    include: {
      item: true
    },
    orderBy: [{ expirationDate: "asc" }, { receivedDate: "asc" }]
  });

  return NextResponse.json(lots);
}

export async function POST(request: Request) {
  const body = await request.json();

  const lot = await prisma.inventoryLot.create({
    data: {
      itemId: body.itemId,
      lotCode: body.lotCode,
      receivedDate: new Date(body.receivedDate),
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
      quantityAvailable: decimal(body.quantityAvailable ?? 0),
      quantityAllocated: decimal(body.quantityAllocated ?? 0)
    }
  });

  return NextResponse.json(lot, { status: 201 });
}
