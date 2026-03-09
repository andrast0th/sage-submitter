import config from "../config";
import logger from "../logger";

const { botToken, chatId } = config.telegram;

/**
 * Send a message via the Telegram Bot API.
 * Silently logs a warning if credentials are not configured.
 */
export const sendTelegramMessage = async (text: string): Promise<void> => {
  if (!botToken || !chatId) {
    logger.warn("Telegram credentials not configured — skipping notification.");
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
      logger.error({ status: res.status, body }, "Telegram API error.");
    } else {
      logger.info("Telegram notification sent.");
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to send Telegram message.");
  }
};

export const notifySafely = async (text: string): Promise<void> => {
  try {
    await sendTelegramMessage(text);
  } catch (err) {
    logger.error({ err }, "Telegram notification failed.");
  }
};
