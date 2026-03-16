import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function GET() {
  const plans = await prisma.productionPlan.findMany({
    include: {
      lines: {
        include: {
          finishedGoodItem: true
        }
      }
    },
    orderBy: {
      startDate: "asc"
    }
  });

  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const body = await request.json();

  const plan = await prisma.productionPlan.create({
    data: {
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      lines: {
        create: (body.lines ?? []).map(
          (line: { finishedGoodItemId: string; quantity: number; scheduledDate?: string | null }) => ({
            finishedGoodItemId: line.finishedGoodItemId,
            scheduledDate: line.scheduledDate ? new Date(line.scheduledDate) : null,
            quantity: decimal(line.quantity)
          })
        )
      }
    } as never,
    include: {
      lines: true
    }
  });

  return NextResponse.json(plan, { status: 201 });
}
