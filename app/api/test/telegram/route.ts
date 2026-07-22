import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET() {
  const now = new Date().toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "full",
    timeStyle: "long",
  });

  const message = [
    "✅ تم الاتصال بنجاح",
    "",
    "🚀 Hala Delivery Telegram Test",
    "",
    `📅 ${now}`,
  ].join("\n");

  const success = await sendTelegramMessage(message);

  return NextResponse.json({ success });
}
