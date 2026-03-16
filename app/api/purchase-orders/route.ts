import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function GET() {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: {
      supplier: true,
      lines: {
        include: {
          item: true
        }
      }
    },
    orderBy: {
      expectedReceiptDate: "asc"
    }
  });

  return NextResponse.json(purchaseOrders);
}

export async function POST(request: Request) {
  const body = await request.json();

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      supplierId: body.supplierId,
      orderDate: new Date(body.orderDate),
      expectedReceiptDate: new Date(body.expectedReceiptDate),
      status: (body.status ?? "OPEN") as PurchaseOrderStatus,
      lines: {
        create: (body.lines ?? []).map((line: { itemId: string; quantity: number; unitCost: number }) => ({
          itemId: line.itemId,
          quantity: decimal(line.quantity),
          unitCost: decimal(line.unitCost)
        }))
      }
    },
    include: {
      lines: true
    }
  });

  return NextResponse.json(purchaseOrder, { status: 201 });
}
