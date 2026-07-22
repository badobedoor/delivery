/*
  Telegram Notification Service

  This module will be the single source of truth for all Telegram
  notifications across the project (new orders, settlements, alerts, etc).

  Currently it only exposes a low-level send function. Higher-level
  notification helpers can be added here later as the project grows.
*/

const TELEGRAM_API = "https://api.telegram.org";

/**
 * Send a plain or HTML-formatted message to the configured Telegram chat.
 *
 * Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from environment variables.
 *
 * @param message - The text to send. Supports a subset of HTML via parse_mode.
 * @returns `true` if the message was accepted by Telegram, `false` otherwise.
 */
export async function sendTelegramMessage(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error(
      "[sendTelegramMessage] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set"
    );
    return false;
  }

  try {
    const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[sendTelegramMessage] Telegram API returned ${res.status}: ${body}`
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[sendTelegramMessage] Network or unexpected error:", err);
    return false;
  }
}
