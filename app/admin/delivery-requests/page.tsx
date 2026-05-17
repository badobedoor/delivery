"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

const C = {
  bg:     "#0F172A",
  card:   "#1E293B",
  teal:   "#14B8A6",
  text:   "#F1F5F9",
  muted:  "#94A3B8",
  border: "#334155",
  green:  "#22C55E",
  red:    "#EF4444",
  orange: "#F97316",
  yellow: "#EAB308",
};

type DeliveryRequest = {
  id:               string;
  restaurant_name:  string;
  delivery_address: string;
  notes:            string | null;
  status:           string;
  created_at:       string;
  areas:            { name: string; delivery_fee: number } | null;
  delivery_staff:   { name: string | null; phone: string | null } | null;
};

type Driver = { id: string; name: string | null; phone: string | null };

function formatTime(iso: string) {
  return new Date(iso + "Z").toLocaleTimeString("ar-EG", {
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo",
  });
}

function formatDate(iso: string) {
  return new Date(iso + "Z").toLocaleDateString("ar-EG", {
    day: "numeric", month: "long", timeZone: "Africa/Cairo",
  });
}

export default function DeliveryRequestsPage() {
  const [requests,    setRequests]    = useState<DeliveryRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [drivers,     setDrivers]     = useState<Driver[]>([]);
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [selectedDrv, setSelectedDrv] = useState("");
  const [assigning,   setAssigning]   = useState(false);

  async function loadData() {
    const [reqRes, drvRes] = await Promise.all([
      supabase
        .from("delivery_requests")
        .select("id, restaurant_name, areas(name, delivery_fee), delivery_address, notes, status, delivery_staff(name, phone), created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("delivery_staff")
        .select("id, name, phone")
        .eq("is_active", true)
        .order("name"),
    ]);
    setRequests((reqRes.data ?? []) as unknown as DeliveryRequest[]);
    setDrivers((drvRes.data ?? []) as Driver[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);
  useAutoRefresh(loadData);

  async function handleAssign() {
    if (!assignModal || !selectedDrv) return;
    setAssigning(true);
    await supabase
      .from("delivery_requests")
      .update({ status: "assigned", delivery_id: selectedDrv })
      .eq("id", assignModal);
    setAssigning(false);
    setAssignModal(null);
    setSelectedDrv("");
    loadData();
  }

  function statusColor(s: string) {
    if (s === "pending")   return { bg: `${C.orange}22`, color: C.orange };
    if (s === "assigned")  return { bg: `${C.teal}22`,   color: C.teal   };
    if (s === "delivered") return { bg: `${C.green}22`,  color: C.green  };
    return                        { bg: `${C.red}22`,    color: C.red    };
  }

  function statusAr(s: string) {
    if (s === "pending")   return "قيد الانتظار";
    if (s === "assigned")  return "تم التعيين";
    if (s === "delivered") return "تم التوصيل";
    return s;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" dir="rtl">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${C.teal} transparent ${C.teal} ${C.teal}` }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black" style={{ color: C.text }}>طلبات الدليفري</h1>
        <span className="text-sm px-3 py-1 rounded-full font-bold"
          style={{ background: `${C.orange}22`, color: C.orange }}>
          {requests.filter(r => r.status === "pending").length} قيد الانتظار
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["المطعم", "المنطقة", "العنوان", "السائق", "الحالة", "الوقت", "الإجراءات"].map((h) => (
                  <th key={h} className="px-3 py-3 text-right text-xs font-semibold whitespace-nowrap"
                    style={{ color: C.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: C.muted }}>
                    لا توجد طلبات
                  </td>
                </tr>
              ) : requests.map((r, i) => {
                const sc = statusColor(r.status);
                return (
                  <tr key={r.id}
                    style={{ borderBottom: i < requests.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <td className="px-3 py-3 text-sm font-semibold whitespace-nowrap"
                      style={{ color: C.text }}>{r.restaurant_name}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {r.areas?.name ?? "—"}
                      {r.areas?.delivery_fee != null && (
                        <span className="block text-[10px]">{r.areas.delivery_fee} ج.م</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs max-w-[180px]" style={{ color: C.muted }}>
                      <p className="truncate">{r.delivery_address}</p>
                      {r.notes && <p className="text-[10px] mt-0.5 opacity-70 truncate">📝 {r.notes}</p>}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: C.muted }}>
                      {r.delivery_staff?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{ background: sc.bg, color: sc.color }}>
                        {statusAr(r.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[10px] whitespace-nowrap" style={{ color: C.muted }}>
                      <p>{formatTime(r.created_at)}</p>
                      <p style={{ color: C.border }}>{formatDate(r.created_at)}</p>
                    </td>
                    <td className="px-3 py-3">
                      {r.status === "pending" && (
                        <button
                          onClick={() => { setAssignModal(r.id); setSelectedDrv(""); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                          style={{ background: `${C.teal}22`, color: C.teal }}>
                          تعيين سائق
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          {requests.length} طلب
        </div>
      </div>

      {/* Assign Driver Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setAssignModal(null); }}>
          <div className="w-full max-w-sm rounded-2xl flex flex-col"
            style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
              <h2 className="text-base font-black" style={{ color: C.text }}>تعيين سائق</h2>
              <button onClick={() => setAssignModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70"
                style={{ background: C.bg, color: C.muted }}>✕</button>
            </div>
            <div className="px-5 py-4">
              <select value={selectedDrv} onChange={(e) => setSelectedDrv(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, colorScheme: "dark" }}>
                <option value="" disabled>اختر السائق</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name ?? "—"} {d.phone ? `• ${d.phone}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: C.border }}>
              <button onClick={handleAssign} disabled={!selectedDrv || assigning}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ background: C.teal, color: "#fff" }}>
                {assigning ? "جاري التعيين..." : "تعيين"}
              </button>
              <button onClick={() => setAssignModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold hover:opacity-80 transition-opacity"
                style={{ background: C.bg, color: C.muted, border: `1px solid ${C.border}` }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
