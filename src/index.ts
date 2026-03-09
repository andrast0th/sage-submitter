import config from "./config";
import { startServices } from "./services";
import { sendTelegramMessage } from "./services/telegramService";
import { getReminderDate, getTriggerDate } from "./utils";

const main = async () => {
  const today = new Date();
  const { daysBeforeMonthEnd, bypassDateCheck } = config;
  console.log(`[${today.toISOString()}] SageSubmitter triggered.`);
  console.log(
    `Configured to run ${daysBeforeMonthEnd} working days before month end.`,
  );

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
    console.log("Reminder day — sending Telegram notification.");
    await sendTelegramMessage(
      `Reminder: your timesheet will be automatically submitted tomorrow (${triggerDateStr}).`,
    );
  }

  if (bypassDateCheck) {
    console.log("BYPASS_DATE_CHECK=true — skipping date check.");
  } else if (today.getDate() !== triggerDay) {
    console.log(
      `Not the trigger date — next run: ${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(triggerDay).padStart(2, "0")}. Skipping.`,
    );
    process.exit(0);
  }

  console.log(
    `${daysBeforeMonthEnd} days before month end — running timesheet fill.`,
  );

  try {
    await startServices();
    console.log("Timesheet filled successfully.");
  } catch (error) {
    console.error("Error filling timesheet:", error);
    process.exit(1);
  }
};

main();
