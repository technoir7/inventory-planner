import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const plan = await prisma.productionPlan.findUnique({
    where: { id: params.id },
    include: { lines: { include: { finishedGoodItem: true } } }
  });

  if (!plan) {
    return NextResponse.json({ error: "Production plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productionPlan.update({
        where: { id: params.id },
        data: {
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate)
        }
      });

      if (body.lines) {
        await tx.productionPlanLine.deleteMany({ where: { productionPlanId: params.id } });
        for (const line of body.lines) {
          await tx.productionPlanLine.create({
            data: {
              productionPlanId: params.id,
              finishedGoodItemId: line.finishedGoodItemId,
              scheduledDate: line.scheduledDate ? new Date(line.scheduledDate) : null,
              quantity: decimal(line.quantity)
            } as never
          });
        }
      }
    });

    const updated = await prisma.productionPlan.findUnique({
      where: { id: params.id },
      include: { lines: { include: { finishedGoodItem: true } } }
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Production plan not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.productionPlan.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Production plan not found" }, { status: 404 });
  }
}
