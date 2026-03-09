import config from "../config";

const { botToken, chatId } = config.telegram;

/**
 * Send a message via the Telegram Bot API.
 * Silently logs a warning if credentials are not configured.
 */
export const sendTelegramMessage = async (text: string): Promise<void> => {
  if (!botToken || !chatId) {
    console.warn(
      "Telegram credentials not configured — skipping notification.",
    );
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Telegram API error (${res.status}): ${body}`);
    } else {
      console.log("Telegram notification sent.");
    }
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
};

export const notifySafely = async (text: string): Promise<void> => {
  try {
    await sendTelegramMessage(text);
  } catch (err) {
    console.error(
      "Telegram notification failed:",
      err instanceof Error ? err.message : String(err),
    );
  }
};
