import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const bom = await prisma.bOM.findUnique({
    where: { id: params.id },
    include: {
      finishedGoodItem: true,
      lines: { include: { componentItem: true } }
    }
  });

  if (!bom) {
    return NextResponse.json({ error: "BOM not found" }, { status: 404 });
  }

  return NextResponse.json(bom);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bOM.update({
        where: { id: params.id },
        data: {
          batchSize: decimal(body.batchSize ?? 1),
          yieldPercent: decimal(body.yieldPercent ?? 100),
          targetPrice: body.targetPrice != null ? decimal(body.targetPrice) : null,
          fillSizeOz: body.fillSizeOz != null ? decimal(body.fillSizeOz) : null,
          labelDescription: body.labelDescription ?? null
        }
      });

      if (body.lines) {
        await tx.bOMLine.deleteMany({ where: { bomId: params.id } });
        for (const line of body.lines) {
          await tx.bOMLine.create({
            data: {
              bomId: params.id,
              componentItemId: line.componentItemId,
              quantityRequired: decimal(line.quantityRequired)
            }
          });
        }
      }
    });

    const updated = await prisma.bOM.findUnique({
      where: { id: params.id },
      include: { lines: { include: { componentItem: true } }, finishedGoodItem: true }
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "BOM not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.bOM.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "BOM not found" }, { status: 404 });
  }
}
