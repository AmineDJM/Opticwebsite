import { NextResponse } from "next/server";
import { searchCatalog } from "@optic/database";
import { getTenant } from "../../../server/tenant.js";

/** Autocomplete endpoint for the header search (§8). */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const tenant = await getTenant();
  if (!tenant.features.search) return NextResponse.json({ products: [], brands: [], categories: [] });
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = await searchCatalog(tenant.db, q, 6);
  return NextResponse.json(results);
}
