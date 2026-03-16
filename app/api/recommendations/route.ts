import { NextResponse } from "next/server";
import { getPlanningSnapshot } from "@/lib/planning/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getPlanningSnapshot();
  return NextResponse.json(snapshot.recommendations);
}
