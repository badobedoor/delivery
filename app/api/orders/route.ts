import { createClient }              from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse }               from "next/server";
import { sendTelegramMessage }        from "@/lib/telegram";

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

  /* 6. إشعار Telegram — يُرسل بعد إنشاء الطلب بنجاح، لا يُفشل الطلب أبداً */
  Promise.resolve().then(async () => {
    try {
      const bodyOrder = body.order as Record<string, unknown>;
      const bodyItems = body.items as Record<string, unknown>[];

      const [restRes, usrRes, addrRes, itemsRes] = await Promise.all([
        db.from("restaurants").select("name").eq("id", bodyOrder["restaurant_id"]).single(),
        db.from("users").select("name, phone").eq("id", user.id).single(),
        db.from("addresses").select("full_address, latitude, longitude").eq("id", bodyOrder["address_id"]).single(),
        db.from("menu_items").select("id, name").in("id", bodyItems.map((i) => String(i["menu_item_id"]))),
      ]);

      const restName = String((restRes.data as Record<string, unknown>)?.name ?? "—");
      const usrName  = String((usrRes.data as Record<string, unknown>)?.name ?? "—");
      const usrPhone = String((usrRes.data as Record<string, unknown>)?.phone ?? "—");
      const addrFull = String((addrRes.data as Record<string, unknown>)?.full_address ?? "—");
      const lat      = (addrRes.data as Record<string, unknown>)?.latitude;
      const lng      = (addrRes.data as Record<string, unknown>)?.longitude;

      const menuArr  = (itemsRes.data ?? []) as Record<string, unknown>[];
      const menuMap  = new Map(menuArr.map((m) => [String(m.id), String(m.name)]));

      const itemLines = bodyItems.map((item) => {
        const extrasArr = (item["extras"] as Record<string, unknown>[] | null) ?? [];
        const name      = menuMap.get(String(item["menu_item_id"])) ?? `#${String(item["menu_item_id"])}`;
        const size      = item["size_name"] ? ` (${String(item["size_name"])})` : "";
        const extras    = extrasArr.length
          ? `\n     ➕ ${extrasArr.map((e) => String(e["name"])).join("، ")}`
          : "";
        return `• ${name}${size} ×${String(item["quantity"])}${extras}`;
      });

      const mapsLink = lat && lng ? `\n🗺️ https://maps.google.com/?q=${String(lat)},${String(lng)}` : "";

      const createdAt = new Date(order.created_at).toLocaleString("ar-EG", {
        timeZone: "Africa/Cairo",
        dateStyle: "short",
        timeStyle: "short",
      });

      const orderRecord = order as Record<string, unknown>;

      const msg = [
        "🛒 <b>طلب جديد</b>",
        "",
        `🆔 رقم الطلب: <b>#${String(orderRecord.user_order_number ?? order.id)}</b>`,
        `🏪 المطعم: ${restName}`,
        `👤 اسم العميل: ${usrName}`,
        `📞 رقم الهاتف: ${usrPhone}`,
        `📍 العنوان: ${addrFull}${mapsLink}`,
        "",
        "🍔 <b>الطلب:</b>",
        ...itemLines,
        "",
        "💰 <b>ملخص الحساب:</b>",
        `   سعر الأكل: ${String(orderRecord.subtotal ?? 0)} ج.م`,
        `   رسوم التوصيل: ${String(orderRecord.delivery_fee ?? 0)} ج.م`,
        `   ─────────────`,
        `   🟰 الإجمالي: ${String(orderRecord.total ?? 0)} ج.م`,
        ...(orderRecord.notes ? [`\n📝 ${String(orderRecord.notes)}`] : []),
        "",
        `🕒 ${createdAt}`,
      ].join("\n");

      await sendTelegramMessage(msg);
    } catch (err) {
      console.error("[orders] Telegram notification error (non-fatal):", err);
    }
  });

  return NextResponse.json({ orderId: order.id });
}
