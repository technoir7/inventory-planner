import { NextResponse } from "next/server";
import { importCsv } from "@/lib/importers";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: { entity: string } }
) {
  try {
    const { entity } = context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const text = await file.text();
    const result = await importCsv(entity, text);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown import error"
      },
      { status: 400 }
    );
  }
}
