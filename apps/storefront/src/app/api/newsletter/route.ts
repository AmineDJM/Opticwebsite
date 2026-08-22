import { NextResponse } from "next/server";
import { emailSchema } from "@optic/core";
import { getTenant } from "../../../server/tenant.js";

/** Newsletter subscription (§45.15). Server-validated; idempotent per email. */
export async function POST(request: Request) {
  const tenant = await getTenant();
  if (!tenant.features.newsletter) return NextResponse.json({ error: "disabled" }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = emailSchema.safeParse((body as { email?: string })?.email);
  if (!parsed.success) return NextResponse.json({ error: "invalid_email" }, { status: 422 });

  try {
    await tenant.db.newsletterSubscriber.upsert({
      where: { websiteId_email: { websiteId: tenant.websiteId, email: parsed.data } } as never,
      update: {},
      create: { email: parsed.data, source: "footer" } as never,
    });
  } catch {
    // Unique violation → already subscribed; treat as success.
  }
  return NextResponse.json({ ok: true });
}
