import config from "./config";
import logger from "./logger";
import { startServices } from "./services";
import { sendTelegramMessage } from "./services/telegramService";
import { getReminderDate, getTriggerDate } from "./utils";

const main = async () => {
  const today = new Date();
  const { daysBeforeMonthEnd, bypassDateCheck } = config;
  logger.info({ daysBeforeMonthEnd }, "SageSubmitter triggered.");

  const triggerDay = getTriggerDate(
    today.getFullYear(),
    today.getMonth() + 1,
    daysBeforeMonthEnd,
  );
  const reminderDay = getReminderDate(
    today.getFullYear(),
    today.getMonth() + 1,
    daysBeforeMonthEnd,
  );

  // Send a reminder the working day before the submission date
  if (!bypassDateCheck && today.getDate() === reminderDay) {
    const triggerDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(triggerDay).padStart(2, "0")}`;
    logger.info(
      { reminderDay, triggerDay },
      "Reminder day — sending Telegram notification.",
    );
    await sendTelegramMessage(
      `Reminder: your timesheet will be automatically submitted tomorrow (${triggerDateStr}).`,
    );
  }

  if (bypassDateCheck) {
    logger.info("BYPASS_DATE_CHECK=true — skipping date check.");
  } else if (today.getDate() !== triggerDay) {
    const nextRun = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(triggerDay).padStart(2, "0")}`;
    logger.info({ nextRun }, "Not the trigger date — skipping.");
    process.exit(0);
  }

  logger.info({ daysBeforeMonthEnd }, "Trigger day — running timesheet fill.");

  try {
    await startServices();
    logger.info("Timesheet filled successfully.");
  } catch (error) {
    logger.error({ err: error }, "Error filling timesheet.");
    process.exit(1);
  }
};

main();
