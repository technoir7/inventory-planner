import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: { supplier: true, lines: { include: { item: true } } }
  });

  if (!po) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }

  return NextResponse.json(po);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          supplierId: body.supplierId,
          orderDate: new Date(body.orderDate),
          expectedReceiptDate: new Date(body.expectedReceiptDate),
          status: (body.status ?? "OPEN") as PurchaseOrderStatus
        }
      });

      if (body.lines) {
        await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: params.id } });
        for (const line of body.lines) {
          await tx.purchaseOrderLine.create({
            data: {
              purchaseOrderId: params.id,
              itemId: line.itemId,
              quantity: decimal(line.quantity),
              unitCost: decimal(line.unitCost)
            }
          });
        }
      }
    });

    const updated = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { supplier: true, lines: { include: { item: true } } }
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.purchaseOrder.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }
}
