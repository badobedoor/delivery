import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server/requireAuth";

/* ── Service-role client — server-only, bypasses RLS, never sent to browser ── */
function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/* ── GET /api/admin/delivery-requests/stats
     Feeds the admin dashboard's entity-delivery-request statistics ONLY.
     delivery_requests has RLS ON — the browser supabase client cannot read it,
     so the dashboard must go through this guarded server API (service-role),
     same pattern as /api/admin/delivery-requests/accounts.

     Query params (ISO timestamps computed by the dashboard, Cairo-aware):
       statsFrom / statsTo  → range for the 3 KPI numbers (طلبات/إيرادات/قيد التنفيذ)
       chartFrom / chartTo  → range for the entity ranking (matches the other
                              top-N cards which use the chart range)

     Returns:
       stats: {
         total:      count of ALL delivery_requests in [statsFrom, statsTo]
         revenue:    sum(delivery_fee) of delivered requests in [statsFrom, statsTo]
         inProgress: count of (pending, accepted, on_the_way) in [statsFrom, statsTo]
       }
       byEntity: [ { name, count } ] — delivered requests grouped by entity
                 (delivered-only, matching the dashboard's top-N convention),
                 sorted desc, top 10. name = current entities.name when available,
                 otherwise the restaurant_name snapshot. ── */
export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const url   = new URL(request.url);
  const sFrom = url.searchParams.get("statsFrom") ?? "";
  const sTo   = url.searchParams.get("statsTo") ?? "";
  const cFrom = url.searchParams.get("chartFrom") ?? "";
  const cTo   = url.searchParams.get("chartTo") ?? "";

  /* ── 1. KPI numbers (stats range) ── */
  let totalQ = service().from("delivery_requests").select("*", { count: "exact", head: true });
  if (sFrom) totalQ = totalQ.gte("created_at", sFrom);
  if (sTo)   totalQ = totalQ.lte("created_at", sTo);
  const { count: total, error: totalErr } = await totalQ;
  if (totalErr) return NextResponse.json({ error: totalErr.message }, { status: 500 });

  let inProgQ = service().from("delivery_requests").select("*", { count: "exact", head: true })
    .in("status", ["pending", "accepted", "on_the_way"]);
  if (sFrom) inProgQ = inProgQ.gte("created_at", sFrom);
  if (sTo)   inProgQ = inProgQ.lte("created_at", sTo);
  const { count: inProgress, error: inProgErr } = await inProgQ;
  if (inProgErr) return NextResponse.json({ error: inProgErr.message }, { status: 500 });

  let revQ = service().from("delivery_requests").select("delivery_fee").eq("status", "delivered");
  if (sFrom) revQ = revQ.gte("created_at", sFrom);
  if (sTo)   revQ = revQ.lte("created_at", sTo);
  const { data: revRows, error: revErr } = await revQ;
  if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 });
  const revenue = (revRows ?? []).reduce((s, r) => s + (r.delivery_fee ?? 0), 0);

  /* ── 2. Entity ranking (chart range, delivered only) ── */
  let entQ = service().from("delivery_requests")
    .select("entity_id, restaurant_name")
    .eq("status", "delivered");
  if (cFrom) entQ = entQ.gte("created_at", cFrom);
  if (cTo)   entQ = entQ.lte("created_at", cTo);
  const { data: entRows, error: entErr } = await entQ;
  if (entErr) return NextResponse.json({ error: entErr.message }, { status: 500 });

  const countByEntity = new Map<string, { name: string; count: number }>();
  const entityIds     = new Set<string>();
  for (const r of entRows ?? []) {
    const key = r.entity_id ? String(r.entity_id) : String(r.restaurant_name ?? "غير معروف");
    const cur = countByEntity.get(key);
    if (cur) cur.count++;
    else {
      countByEntity.set(key, { name: r.restaurant_name || "غير معروف", count: 1 });
      if (r.entity_id) entityIds.add(String(r.entity_id));
    }
  }

  const top = [...countByEntity.entries()]
    .map(([key, v]) => ({ key, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  /* Resolve current entity names (entities.name) for the shown rows only */
  const topIds = top.filter((t) => entityIds.has(t.key)).map((t) => t.key);
  if (topIds.length > 0) {
    const { data: entities } = await service()
      .from("entities")
      .select("id, name")
      .in("id", topIds);
    const nameById = new Map((entities ?? []).map((e) => [String(e.id), e.name]));
    top.forEach((t) => {
      const n = nameById.get(t.key);
      if (n) t.name = n;
    });
  }

  const byEntity = top.map(({ name, count }) => ({ name, count }));

  return NextResponse.json(
    { stats: { total: total ?? 0, revenue, inProgress: inProgress ?? 0 }, byEntity },
    { status: 200 },
  );
}
