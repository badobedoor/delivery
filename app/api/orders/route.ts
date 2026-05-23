import { createClient }              from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse }               from "next/server";

const ACTIVE_STATUSES = ["new", "pending"];

function serviceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  /* 1. تحقق من هوية المستخدم عبر جلسة Supabase المخزنة في الكوكيز */
  const serverClient = await createSupabaseServerClient();
  const { data: { user } } = await serverClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* 2. اقرأ الـ body */
  let body: {
    order: Record<string, unknown>;
    items: Record<string, unknown>[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const db = serviceDb();

  /* 3. الـ check server-side — عدّ الطلبات النشطة */
  const { count } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ACTIVE_STATUSES);

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: "limit_reached" }, { status: 429 });
  }

  /* 4. أنشئ الأوردر — user_id من السيرفر دايماً، مش من الـ body */
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({ ...body.order, user_id: user.id })
    .select()
    .single();

  if (orderError || !order) {
    console.error("Order insert error:", orderError);
    return NextResponse.json({ error: "order_failed" }, { status: 500 });
  }

  /* 5. أنشئ الـ order items */
  if (body.items?.length) {
    const items = body.items.map((item) => ({ ...item, order_id: order.id }));
    const { error: itemsError } = await db.from("order_items").insert(items);
    if (itemsError) console.error("Order items insert error:", itemsError);
  }

  return NextResponse.json({ orderId: order.id });
}
