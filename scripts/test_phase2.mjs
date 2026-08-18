import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Load .env.local without dotenv
const envMap = {};
try {
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) envMap[m[1]] = m[2].replace(/^["']|["']$/g, "");
    });
} catch { /* env already set */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? envMap.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? envMap.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("MISSING ENV"); process.exit(1); }
const sb = createClient(url, key);

const MARK = "PH2T_" + Math.random().toString(36).slice(2, 10);
const results = [];
function pass(name, cond, extra) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${extra !== undefined ? "  [" + JSON.stringify(extra) + "]" : ""}`);
}
const round = (n) => Math.round(n);

/* ── cleanup tracking ── */
const clean = {
  deliveryStaff: [], shifts: [], deliveryShifts: [], orders: [], deliveryRequests: [],
  custody: [], advance: [], deliveryAccounts: [], motorcycleAccounts: [],
  mainWallet: [], custodyWallet: [], motorcycles: [], restaurants: [], entities: [], areas: [],
};

async function q(name, fn) { try { return await fn(); } catch (e) { console.error("  !! " + name, e.message); return null; } }

async function setup() {
  const { data: settings } = await sb.from("settings").select("driver_percentage, moto_percentage, office_percentage").single();
  if (!settings) throw new Error("settings not found");
  const pct = { d: settings.driver_percentage ?? 0, m: settings.moto_percentage ?? 0, o: settings.office_percentage ?? 0 };

  /* driver */
  const dName = "سائق اختبار " + MARK;
  const { data: drv } = await sb.from("delivery_staff").insert({ name: dName, phone: "010" + MARK.slice(0,8), password: "x", is_active: true }).select("id, wallet_balance").single();
  clean.deliveryStaff.push(drv.id);

  /* motorcycle */
  const { data: moto } = await sb.from("motorcycles").insert({ name: "موتوسيكل " + MARK, is_active: true }).select("id, wallet_balance").single();
  clean.motorcycles.push(moto.id);

  /* restaurant, entity, area */
  const { data: rest } = await sb.from("restaurants").insert({ name: "مطعم " + MARK, description: null, address: null }).select("id").single();
  clean.restaurants.push(rest.id);
  const { data: ent } = await sb.from("entities").insert({ name: "منشأة " + MARK, phone: "011" + MARK.slice(0,8), password: "x", is_active: true }).select("id, name").single();
  clean.entities.push(ent.id);
  const { data: area } = await sb.from("areas").insert({ name: "منطقة " + MARK, delivery_fee: 40, is_active: true }).select("id").single();
  clean.areas.push(area.id);

  /* operational shifts S0(old, closed) S1 S2 */
  const { data: s0 } = await sb.from("shifts").insert({ num: 9001, start_time: "01:00:00", end_time: "02:00:00", is_active: false, started_date: null }).select("id").single();
  const { data: s1 } = await sb.from("shifts").insert({ num: 9002, start_time: "07:00:00", end_time: "15:00:00", is_active: true, started_date: "2026-08-17" }).select("id").single();
  const { data: s2 } = await sb.from("shifts").insert({ num: 9003, start_time: "15:00:00", end_time: "23:00:00", is_active: false, started_date: null }).select("id").single();
  clean.shifts.push(s0.id, s1.id, s2.id);

  /* delivery_shifts: D0 (S0, closed) D1 (S1, open) D2 (S2, open) */
  const { data: d0 } = await sb.from("delivery_shifts").insert({ delivery_id: drv.id, motorcycle_id: null, shift_id: s0.id, is_active: false, status: "closed" }).select("id").single();
  const { data: d1 } = await sb.from("delivery_shifts").insert({ delivery_id: drv.id, motorcycle_id: moto.id, shift_id: s1.id, is_active: true, status: "open" }).select("id").single();
  const { data: d2 } = await sb.from("delivery_shifts").insert({ delivery_id: drv.id, motorcycle_id: null, shift_id: s2.id, is_active: true, status: "open" }).select("id").single();
  clean.deliveryShifts.push(d0.id, d1.id, d2.id);

  /* orders: O0(S0, delivered+settled) O1,O2(S1, delivered unsettled) O3(S2, delivered unsettled) */
  const mkOrder = async (shiftId, fee, payment, cash, voda, settled) => {
    const { data: o } = await sb.from("orders").insert({
      restaurant_id: rest.id, delivery_fee: fee, notes: MARK, order_type: "delivery", status: "delivered",
      total: 100 + fee, subtotal: 100, discount_amount: 0,
      delivery_id: drv.id, shift_id: shiftId, payment_method: payment,
      cash_amount: cash, vodafone_amount: voda, settled,
    }).select("id").single();
    clean.orders.push(o.id);
    return o;
  };
  const O0 = await mkOrder(s0.id, 10, "cash", 110, 0, true);
  const O1 = await mkOrder(s1.id, 30, "cash", 150, 0, false);
  const O2 = await mkOrder(s1.id, 20, "vodafone", 0, 120, false);
  const O3 = await mkOrder(s2.id, 25, "cash", 125, 0, false);

  /* delivery_requests: R1(D1 delivered, fee40, price500) R2(D2 delivered, fee15, price300) */
  const mkReq = async (dsId, fee, price) => {
    const { data: r } = await sb.from("delivery_requests").insert({
      entity_id: ent.id, restaurant_name: ent.name, customer_phone: "01012345678", area_id: area.id,
      notes: MARK, price, delivery_fee: fee, status: "delivered",
      delivery_id: drv.id, delivery_shift_id: dsId, created_at: new Date().toISOString(), delivered_at: new Date().toISOString(),
    }).select("id").single();
    clean.deliveryRequests.push(r.id);
    return r;
  };
  const R1 = await mkReq(d1.id, 40, 500);
  const R2 = await mkReq(d2.id, 15, 300);

  /* custody + advance requests */
  const { data: cust } = await sb.from("custody_records").insert({ delivery_id: drv.id, amount: 100, status: "active" }).select("id").single();
  clean.custody.push(cust.id);
  const ar1amount = 150 + 120 + 100 + 40; /* cash + vodafone + custody + entity fee */
  const ar2amount = 125 + 0 + 100 + 15;
  const { data: ar1 } = await sb.from("advance_requests").insert({ delivery_id: drv.id, delivery_shift_id: d1.id, amount: ar1amount, note: "طلب تقفيل وردية " + MARK, status: "pending_close" }).select("id, amount").single();
  const { data: ar2 } = await sb.from("advance_requests").insert({ delivery_id: drv.id, delivery_shift_id: d2.id, amount: ar2amount, note: "طلب تقفيل وردية " + MARK, status: "pending_close" }).select("id, amount").single();
  clean.advance.push(ar1.id, ar2.id);

  return { pct, drv, moto, s0, s1, s2, d0, d1, d2, O0, O1, O2, O3, R1, R2, cust, ar1, ar2, ent };
}

/* TEST A — إيقاف الوردية التشغيلية (الخيار B) */
async function runA(g) {
  await sb.from("delivery_shifts")
    .update({ is_active: false, status: "pending_close" })
    .eq("shift_id", g.s1.id).eq("status", "open");
  const { data: d1 } = await sb.from("delivery_shifts").select("status, is_active, shift_id").eq("id", g.d1.id).single();
  pass("A1: D1 أصبحت pending_close وليس closed", d1.status === "pending_close", d1.status);
  pass("A2: D1.is_active = false بعد إيقاف الوردية التشغيلية", d1.is_active === false, d1.is_active);
  pass("A3: D1.shift_id ما زالت S1", String(d1.shift_id) === String(g.s1.id), d1.shift_id);
}

/* TEST B — فتح S2 لا يعيد ربط D1 */
async function runB(g) {
  await sb.from("delivery_shifts").update({ shift_id: g.s2.id }).eq("is_active", true);
  const { data: d1 } = await sb.from("delivery_shifts").select("status, is_active, shift_id").eq("id", g.d1.id).single();
  pass("B1: فتح S2 لم يُعد ربط D1 — shift_id ثابت على S1", String(d1.shift_id) === String(g.s1.id), d1.shift_id);
  pass("B2: D1 ما زالت pending_close", d1.status === "pending_close", d1.status);
  await sb.from("delivery_shifts")
    .update({ is_active: false, status: "pending_close" })
    .eq("shift_id", g.s2.id).eq("status", "open");
}

/* TEST C — موافقة التقفيل: deliveryShiftId فقط، أوردرات مقيدة، منشآت تدخل، price لا يدخل */
async function runC(g) {
  const req = { deliveryId: g.drv.id, deliveryShiftId: g.d1.id };
  const { data: shiftRow } = await sb.from("delivery_shifts").select("shift_id, motorcycle_id").eq("id", req.deliveryShiftId).maybeSingle();
  const shiftId = shiftRow?.shift_id ?? null;
  const motorcycleId = shiftRow?.motorcycle_id ?? null;
  pass("C0: shift_id الخاص بالوردية المحددة = S1", String(shiftId) === String(g.s1.id), shiftId);

  const { data: orders } = shiftId != null
    ? await sb.from("orders").select("id, delivery_fee").eq("delivery_id", req.deliveryId).eq("shift_id", shiftId).eq("status", "delivered").eq("settled", false)
    : { data: [] };
  const ordersFees = round((orders ?? []).reduce((s, o) => s + (o.delivery_fee ?? 0), 0));
  pass("C1: أوردرات D1 = O1+O2 فقط (لا O0 ولا O3)", ordersFees === 50, { ordersFees, ids: (orders ?? []).map((o) => o.id) });

  const { data: ents } = await sb.from("delivery_requests").select("delivery_fee").eq("delivery_id", req.deliveryId).eq("delivery_shift_id", req.deliveryShiftId).eq("status", "delivered");
  const entityFees = round((ents ?? []).reduce((s, r) => s + (r.delivery_fee ?? 0), 0));
  pass("C2: أجور المنشآت لـ D1 = 40 (price=500 لا يدخل)", entityFees === 40, entityFees);

  const totalDeliveryFees = round(ordersFees + entityFees);
  pass("C3: إجمالي أجور التوصيل = 90 (50 + 40)", totalDeliveryFees === 90, totalDeliveryFees);

  const { data: custody } = await sb.from("custody_records").select("amount").eq("delivery_id", req.deliveryId).eq("status", "active");
  const totalCustody = round((custody ?? []).reduce((s, c) => s + (c.amount ?? 0), 0));
  pass("C4: العهدة النشطة = 100", totalCustody === 100, totalCustody);

  const driverShare = round(totalDeliveryFees * (g.pct.d / 100));
  const motoShare   = round(totalDeliveryFees * (g.pct.m / 100));
  const officeShare = round(totalDeliveryFees * (g.pct.o / 100));
  /* كل حصة = round(إجمالي × النسبة) — أثر التقريب العشري (0.35×90=31.499…) يجعل
     المجموع قد يقل عن الإجمالي بـ 1 ج.م، وهذا هو سلوك roundEGP الحالي في الكود. */
  pass("C5: كل حصة = round(90 × النسبة)", driverShare === round(90 * (g.pct.d / 100)) && motoShare === round(90 * (g.pct.m / 100)) && officeShare === round(90 * (g.pct.o / 100)), { driverShare, motoShare, officeShare });
  pass("C5b: مجموع الحصص ضمن هامش التقريب (±2) من إجمالي 90", Math.abs(driverShare + motoShare + officeShare - 90) <= 2, driverShare + motoShare + officeShare);

  const { data: lastDel } = await sb.from("delivery_accounts").select("balance").eq("delivery_id", req.deliveryId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const lastDelBal = round(lastDel?.balance ?? 0);
  const { data: comm, error: commErr } = await sb.from("delivery_accounts").insert({
    delivery_id: req.deliveryId, type: "commission", amount: driverShare,
    reason: "حصة من رسوم التوصيل — " + MARK, from_wallet: "office", balance: round(lastDelBal + driverShare),
  }).select("id, amount").single();
  if (commErr) throw commErr;
  clean.deliveryAccounts.push(comm.id);
  pass("C6: delivery_accounts commission = driverShare من 90 (يشمل المنشآت)", comm.amount === driverShare, { comm: comm.amount, driverShare });

  const { data: drvBal } = await sb.from("delivery_staff").select("wallet_balance").eq("id", req.deliveryId).single();
  const beforeWallet = drvBal.wallet_balance ?? 0;
  await sb.rpc("adjust_driver_wallet", { p_driver_id: req.deliveryId, p_operation: "increment", p_amount: driverShare });
  const { data: drvAfter } = await sb.from("delivery_staff").select("wallet_balance").eq("id", req.deliveryId).single();
  pass("C7: محفظة السائق زادت بـ driverShare", round((drvAfter.wallet_balance ?? 0) - beforeWallet) === driverShare, { delta: round(drvAfter.wallet_balance - beforeWallet), driverShare });
  clean.deliveryStaffWalletReset = { id: req.deliveryId, value: beforeWallet };

  const { data: lastMoto } = await sb.from("motorcycle_accounts").select("balance").eq("motorcycle_id", motorcycleId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const lastMotoBal = round(lastMoto?.balance ?? 0);
  const { data: motoAcc, error: motoErr } = await sb.from("motorcycle_accounts").insert({
    motorcycle_id: motorcycleId, type: "commission", amount: motoShare,
    reason: "حصة موتسكل — " + MARK, balance: round(lastMotoBal + motoShare),
  }).select("id, amount").single();
  if (motoErr) throw motoErr;
  clean.motorcycleAccounts.push(motoAcc.id);
  pass("C8: motorcycle_accounts commission = motoShare من 90", motoAcc.amount === motoShare, { motoAcc: motoAcc.amount, motoShare });

  const { data: motoBal } = await sb.from("motorcycles").select("wallet_balance").eq("id", motorcycleId).single();
  const beforeMoto = motoBal.wallet_balance ?? 0;
  await sb.rpc("adjust_motorcycle_wallet", { p_motorcycle_id: motorcycleId, p_operation: "increment", p_amount: motoShare });
  const { data: motoAfter } = await sb.from("motorcycles").select("wallet_balance").eq("id", motorcycleId).single();
  pass("C9: محفظة الموتسكل زادت بـ motoShare", round((motoAfter.wallet_balance ?? 0) - beforeMoto) === motoShare, { delta: round(motoAfter.wallet_balance - beforeMoto), motoShare });
  clean.motorcycleWalletReset = { id: motorcycleId, value: beforeMoto };

  const { data: lastMain } = await sb.from("main_wallet").select("balance").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: mw, error: mwErr } = await sb.from("main_wallet").insert({ type: "commission", amount: officeShare, reason: "حصة المكتب — " + MARK, balance: round((lastMain?.balance ?? 0) + officeShare) }).select("id, amount").single();
  if (mwErr) throw mwErr;
  clean.mainWallet.push(mw.id);
  pass("C10: main_wallet office share = officeShare من 90", mw.amount === officeShare, { mw: mw.amount, officeShare });

  const { data: lastCust } = await sb.from("custody_wallet").select("balance").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (totalCustody > 0) {
    const { data: cw, error: cwErr } = await sb.from("custody_wallet").insert({ type: "تحصيل", amount: totalCustody, reason: "استرداد عهدة — " + MARK, balance: round((lastCust?.balance ?? 0) + totalCustody) }).select("id, amount").single();
    if (cwErr) throw cwErr;
    clean.custodyWallet.push(cw.id);
    pass("C11: custody_wallet استرداد = 100", cw.amount === totalCustody, cw.amount);
  }
  await sb.from("custody_records").update({ status: "returned" }).eq("delivery_id", req.deliveryId).eq("status", "active");

  if (shiftId != null) {
    await sb.from("orders").update({ settled: true }).eq("delivery_id", req.deliveryId).eq("shift_id", shiftId).eq("status", "delivered").eq("settled", false);
  }
  const getO = async (o) => (await sb.from("orders").select("status, payment_method, shift_id, settled").eq("id", o.id).single()).data;
  const a1 = await getO(g.O1), a2 = await getO(g.O2), a3 = await getO(g.O3);
  pass("C12: O1 و O2 (S1) أصبحت settled", a1.settled === true && a2.settled === true, { O1: a1.settled, O2: a2.settled });
  pass("C13: O3 (S2) لم تتأثر — settled=false", a3.settled === false, a3.settled);
  pass("C14: O3 (S2) shift_id ثابت — لم يتغير workflow الأوردر", String(a3.shift_id) === String(g.s2.id) && a3.status === "delivered", { shift: a3.shift_id, status: a3.status });

  /* Step 9 (مطابق للكود): اعتماد طلبات السلفة المعلقة على هذه الوردية المالية
     ثم اعتماد طلب التقفيل نفسه (req.id = AR1) — لا يمس طلبات وردية أخرى */
  await sb.from("advance_requests").update({ status: "approved" }).eq("delivery_shift_id", req.deliveryShiftId).eq("status", "pending");
  await sb.from("advance_requests").update({ status: "approved" }).eq("id", g.ar1.id);

  /* Step 10 (مطابق للكود): إغلاق فقط الوردية المالية المحددة في طلب التقفيل */
  await sb.from("delivery_shifts").update({ status: "closed" }).eq("id", req.deliveryShiftId);
  const { data: d1s } = await sb.from("delivery_shifts").select("status").eq("id", g.d1.id).single();
  const { data: d2s } = await sb.from("delivery_shifts").select("status").eq("id", g.d2.id).single();
  pass("C15: D1 فقط أصبحت closed", d1s.status === "closed", d1s.status);
  pass("C16: D2 (pending_close لنفس الدليفري) لم تُغلق", d2s.status === "pending_close", d2s.status);

  const { data: ar1 } = await sb.from("advance_requests").select("status").eq("id", g.ar1.id).single();
  const { data: ar2 } = await sb.from("advance_requests").select("status").eq("id", g.ar2.id).single();
  pass("C17: AR1 أصبح approved", ar1.status === "approved", ar1.status);
  pass("C18: AR2 ما زال pending_close", ar2.status === "pending_close", ar2.status);
}

// ── TEST D — الوردية المالية الحالية بعد التقفيل + عزل الوردية القديمة المغلقة ──
async function runD(g) {
  const { data: shifts } = await sb.from("delivery_shifts").select("id, shift_id, status").eq("delivery_id", g.drv.id).order("started_at", { ascending: false });
  const current = (shifts ?? []).find((s) => s.status === "open" || s.status === "pending_close") ?? null;
  pass("D1: الوردية الحالية (أحدث open/pending_close) = D2", String(current?.id) === String(g.d2.id), current?.id ?? null);
  pass("D2: D0 القديمة المغلقة لا تدخل في الوردية الحالية", current?.id !== g.d0.id);
  pass("D3: D1 المغلقة لا تدخل في الوردية الحالية", current?.id !== g.d1.id);

  const { data: o0 } = await sb.from("orders").select("status, shift_id, settled").eq("id", g.O0.id).single();
  pass("D4: O0 (S0 قديمة) لا تزال settled ومرتبطة بـ S0 — لم تدخل في تقفيل D1", o0.settled === true && String(o0.shift_id) === String(g.s0.id), o0);
}

// ── TEST E — price لا يدخل في تحصيل السائق أبدًا ──
async function runE(g) {
  pass("E1: مبلغ AR1 = 410 = كاش150 + فودافون120 + عهدة100 + fee40 (بدون price500)", g.ar1.amount === 410, g.ar1.amount);
  pass("E2: مبلغ AR2 = 240 = كاش125 + عهدة100 + fee15 (بدون price300)", g.ar2.amount === 240, g.ar2.amount);
  const { data: r1 } = await sb.from("delivery_requests").select("price, delivery_fee").eq("id", g.R1.id).single();
  pass("E3: R1.price ما زال 500 — لم يُضف للتحصيل", r1.price === 500, r1.price);
  pass("E4: R1.delivery_fee = 40 — هو الوحيد الذي يدخل", r1.delivery_fee === 40, r1.delivery_fee);
}

// ── TEST F — توزيع حصة المنشآت بنفس النسب (وليس 100% للسائق) ──
async function runF(g) {
  const { data: lastDel } = await sb.from("delivery_accounts").select("amount, balance").eq("delivery_id", g.drv.id).eq("type", "commission").order("created_at", { ascending: false }).limit(1).single();
  const total = 90, driverShare = round(total * (g.pct.d / 100));
  const { data: lastMoto } = await sb.from("motorcycle_accounts").select("amount").eq("motorcycle_id", g.moto.id).eq("type", "commission").order("created_at", { ascending: false }).limit(1).single();
  const motoShare = round(total * (g.pct.m / 100));
  const { data: lastMain } = await sb.from("main_wallet").select("amount").eq("type", "commission").order("created_at", { ascending: false }).limit(1).single();
  const officeShare = round(total * (g.pct.o / 100));
  pass("F1: حصة السائق = 90 × نسبة السائق فقط (تشمل حصته من المنشآت)", lastDel.amount === driverShare, { actual: lastDel.amount, expected: driverShare });
  pass("F2: حصة الموتسكل = 90 × نسبة الموتسكل", lastMoto.amount === motoShare, { actual: lastMoto.amount, expected: motoShare });
  pass("F3: حصة المكتب = 90 × نسبة المكتب", lastMain.amount === officeShare, { actual: lastMain.amount, expected: officeShare });
  if (g.pct.d < 100) {
    pass("F4: حصة السائق ليست 100% من الأجور (fee المنشأة موزعة بالنسب)", lastDel.amount < total, lastDel.amount);
  } else {
    pass("F4: نسبة السائق 100% → الحصة تساوي الإجمالي", lastDel.amount === total, lastDel.amount);
  }
}

// ── TEST G — الأرشيف: closed delivery_shifts فقط، الأوردرات والمنشآت منفصلتان ──
async function runG(g) {
  const { data: closed } = await sb.from("delivery_shifts")
    .select("id, shift_id, status, shifts!shift_id(num)")
    .eq("delivery_id", g.drv.id).eq("status", "closed");
  const closedIds = (closed ?? []).map((d) => d.id);
  pass("G1: الورديات المغلقة = D0 و D1 فقط", closedIds.includes(g.d0.id) && closedIds.includes(g.d1.id) && !closedIds.includes(g.d2.id), closedIds);
  const closedShiftIds = (closed ?? []).map((d) => d.shift_id ?? "");
  pass("G2: شغل S1 (المقفل) موجود في الأرشيف", closedShiftIds.includes(g.s1.id), closedShiftIds);

  const { data: orders } = await sb.from("orders").select("shift_id, delivery_fee").eq("delivery_id", g.drv.id).eq("status", "delivered").eq("settled", true);
  const feeByShift = {};
  (orders ?? []).forEach((o) => { const k = String(o.shift_id); feeByShift[k] = round((feeByShift[k] ?? 0) + (o.delivery_fee ?? 0)); });
  pass("G3: أرشيف أوردرات S0 = 10 (O0)", feeByShift[g.s0.id] === 10, feeByShift[g.s0.id]);
  pass("G4: أرشيف أوردرات S1 = 50 (O1+O2)", feeByShift[g.s1.id] === 50, feeByShift[g.s1.id]);
  pass("G5: أوردرات S2 لم تدخل الأرشيف (D2 غير مغلقة)", feeByShift[g.s2.id] === undefined, feeByShift[g.s2.id]);

  const { data: ents } = await sb.from("delivery_requests").select("delivery_shift_id, delivery_fee").eq("delivery_id", g.drv.id).eq("status", "delivered");
  const feeByDs = {};
  (ents ?? []).forEach((r) => { feeByDs[r.delivery_shift_id] = round((feeByDs[r.delivery_shift_id] ?? 0) + (r.delivery_fee ?? 0)); });
  pass("G6: منشآت D1 = 40 في أرشيفها", feeByDs[g.d1.id] === 40, feeByDs[g.d1.id]);
  pass("G7: منشآت D2 (غير مغلقة) لم تدخل في أرشيف وردية مغلقة", feeByDs[g.d2.id] === undefined || !closedIds.includes(g.d2.id));
  pass("G8: إجمالي تقفيل D1 = أوردرات50 + منشآت40 = 90", (feeByShift[g.s1.id] ?? 0) + (feeByDs[g.d1.id] ?? 0) === 90, { orders: feeByShift[g.s1.id], entities: feeByDs[g.d1.id] });
}

// ── TEST H — Workflow الطلبات العادية لم يتغير إطلاقًا ──
async function runH(g) {
  const get = async (o) => (await sb.from("orders").select("id, status, payment_method, shift_id, cash_amount, vodafone_amount, settled").eq("id", o.id).single()).data;
  const h0 = await get(g.O0), h1 = await get(g.O1), h2 = await get(g.O2), h3 = await get(g.O3);
  pass("H1: O0 موجود — status delivered, cash, S0, settled", h0.status === "delivered" && h0.payment_method === "cash" && String(h0.shift_id) === String(g.s0.id) && h0.settled === true, h0);
  pass("H2: O1 موجود — delivered, cash, S1, settled بعد التقفيل", h1.status === "delivered" && h1.payment_method === "cash" && String(h1.shift_id) === String(g.s1.id) && h1.settled === true, h1);
  pass("H3: O2 موجود — delivered, vodafone, S1, settled", h2.status === "delivered" && h2.payment_method === "vodafone" && String(h2.shift_id) === String(g.s1.id) && h2.settled === true, h2);
  pass("H4: O3 موجود — delivered, cash, S2, unsettled", h3.status === "delivered" && h3.payment_method === "cash" && String(h3.shift_id) === String(g.s2.id) && h3.settled === false, h3);
  pass("H5: المبالغ المحصلة لم تتغير (O1=150 cash، O2=120 voda، O3=125 cash)", h1.cash_amount === 150 && h2.vodafone_amount === 120 && h3.cash_amount === 125, { h1: h1.cash_amount, h2: h2.vodafone_amount, h3: h3.cash_amount });
}

// ── TEST I — منطق API حساب المنشآت: current = أحدث open/pending_close، archive بمعرف الوردية المالية ──
async function runI(g) {
  const { data: shifts } = await sb.from("delivery_shifts").select("id, shift_id, status").eq("delivery_id", g.drv.id).order("started_at", { ascending: false });
  const shiftByDsId = new Map();
  (shifts ?? []).forEach((ds) => { if (ds.id && ds.shift_id) shiftByDsId.set(ds.id, ds.shift_id); });
  const current = (shifts ?? []).find((s) => s.status === "open" || s.status === "pending_close") ?? null;
  pass("I1: currentShiftId = D2 (R1 في D1 المغلقة لا تعرض كحالية)", String(current?.id) === String(g.d2.id), current?.id ?? null);

  if (current?.id) {
    const { data: cur } = await sb.from("delivery_requests").select("id, delivery_shift_id").eq("delivery_id", g.drv.id).eq("delivery_shift_id", current.id).in("status", ["accepted", "on_the_way", "delivered"]);
    pass("I2: طلبات الوردية الحالية = R2 فقط", (cur ?? []).length === 1 && cur[0].id === g.R2.id, (cur ?? []).map((r) => r.id));
  }

  const dsIds = Array.from(shiftByDsId.keys());
  const { data: arch } = await sb.from("delivery_requests").select("delivery_shift_id, delivery_fee").eq("delivery_id", g.drv.id).eq("status", "delivered").in("delivery_shift_id", dsIds);
  const archive = (arch ?? []).map((r) => ({ delivery_shift_id: r.delivery_shift_id, shift_id: shiftByDsId.get(r.delivery_shift_id) ?? "", delivery_fee: r.delivery_fee ?? 0 })).filter((r) => r.shift_id !== "");
  const r1row = archive.find((r) => r.delivery_shift_id === g.d1.id);
  const r2row = archive.find((r) => r.delivery_shift_id === g.d2.id);
  pass("I3: أرشيف R1 يحمل delivery_shift_id=D1 + shift_id=S1 + fee=40", r1row && r1row.shift_id === g.s1.id && r1row.delivery_fee === 40, r1row);
  pass("I4: أرشيف R2 يحمل delivery_shift_id=D2 + shift_id=S2 + fee=15", r2row && r2row.shift_id === g.s2.id && r2row.delivery_fee === 15, r2row);
}

// ── تنظيف ──
async function cleanup(g) {
  const ids = (arr) => arr.filter(Boolean);
  const del = async (t, id) => { if (id) await sb.from(t).delete().eq("id", id); };
  const delMany = async (t, arr) => { for (const id of ids(arr)) await del(t, id); };

  if (clean.deliveryStaffWalletReset) {
    await sb.from("delivery_staff").update({ wallet_balance: clean.deliveryStaffWalletReset.value }).eq("id", clean.deliveryStaffWalletReset.id);
  }
  if (clean.motorcycleWalletReset) {
    await sb.from("motorcycles").update({ wallet_balance: clean.motorcycleWalletReset.value }).eq("id", clean.motorcycleWalletReset.id);
  }

  await delMany("main_wallet", clean.mainWallet);
  await delMany("custody_wallet", clean.custodyWallet);
  await delMany("delivery_accounts", clean.deliveryAccounts);
  await delMany("motorcycle_accounts", clean.motorcycleAccounts);
  await delMany("custody_records", clean.custody);
  await delMany("advance_requests", clean.advance);
  await delMany("delivery_requests", clean.deliveryRequests);
  await delMany("orders", clean.orders);
  await delMany("delivery_shifts", clean.deliveryShifts);
  await delMany("motorcycles", clean.motorcycles);
  await delMany("shifts", clean.shifts);
  await delMany("delivery_staff", clean.deliveryStaff);
  await delMany("restaurants", clean.restaurants);
  await delMany("entities", clean.entities);
  await delMany("areas", clean.areas);
  console.log("cleanup done (" + MARK + ")");
}

// ── RUNNER ──
(async () => {
  let g;
  try {
    g = await setup();
    console.log("\n══ المرحلة الثانية — اختبارات ══  " + MARK + "\n");
    await runA(g);   // الخيار B: إيقاف التشغيلية → is_active:false + pending_close
    await runB(g);   // فتح S2 لا يعيد ربط D1
    await runC(g);   // التقفيل: deliveryShiftId فقط + أوردرات S1 + منشآت D1 + توزيع النسب
    await runD(g);   // الوردية الحالية + عزل القديمة
    await runE(g);   // price خارج التحصيل
    await runF(g);   // توزيع حصة المنشآت بالنسب
    await runG(g);   // الأرشيف
    await runH(g);   // Workflow الأوردرات
    await runI(g);   // API حساب المنشآت
  } catch (e) {
    console.error("RUNNER ERROR:", e.message);
  } finally {
    const fails = results.filter((r) => !r.ok);
    console.log("\n── النتائج ──\nPASS " + (results.length - fails.length) + " / " + results.length);
    fails.forEach((f) => console.log("  ✗ " + f.name));
    if (g) await cleanup(g);
    process.exit(fails.length === 0 ? 0 : 1);
  }
})();
