import logger from "../logger";
import { SageService } from "./sageService";
import { notifySafely } from "./telegramService";

export const startServices = async (): Promise<void> => {
  const sageService = new SageService();
  let primaryError: unknown;

  try {
    await sageService.init();
    await sageService.signIn();
    await sageService.navigateToTimesheets();
    const submitted = await sageService.submitTimesheet();

    if (submitted) {
      logger.info("Timesheet was submitted.");
      await notifySafely("Timesheet submitted successfully.");
    } else {
      logger.info("Timesheet was already submitted.");
    }
  } catch (error) {
    primaryError = error;
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ err: error }, "Timesheet submission failed.");
    await notifySafely(`Timesheet submission failed: ${message}`);

    throw error;
  } finally {
    try {
      await sageService.close();
    } catch (closeError) {
      logger.error({ err: closeError }, "Failed to close browser.");
      if (!primaryError) primaryError = closeError;
    }
  }

  if (primaryError) throw primaryError;
};
