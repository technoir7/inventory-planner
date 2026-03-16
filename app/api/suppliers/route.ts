import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      supplierItems: {
        include: {
          item: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  return NextResponse.json(suppliers);
}

export async function POST(request: Request) {
  const body = await request.json();
  const supplier = await prisma.supplier.create({
    data: {
      name: body.name,
      contact: body.contact ?? null,
      leadTimeDays: body.leadTimeDays ?? 0
    }
  });

  return NextResponse.json(supplier, { status: 201 });
}
