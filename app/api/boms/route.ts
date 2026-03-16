import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function GET() {
  const boms = await prisma.bOM.findMany({
    include: {
      finishedGoodItem: true,
      lines: {
        include: {
          componentItem: true
        }
      }
    },
    orderBy: {
      finishedGoodItem: {
        name: "asc"
      }
    }
  });

  return NextResponse.json(boms);
}

export async function POST(request: Request) {
  const body = await request.json();

  const bom = await prisma.bOM.create({
    data: {
      finishedGoodItemId: body.finishedGoodItemId,
      batchSize: decimal(body.batchSize ?? 1),
      lines: {
        create: (body.lines ?? []).map((line: { componentItemId: string; quantityRequired: number }) => ({
          componentItemId: line.componentItemId,
          quantityRequired: decimal(line.quantityRequired)
        }))
      }
    },
    include: {
      lines: true
    }
  });

  return NextResponse.json(bom, { status: 201 });
}
