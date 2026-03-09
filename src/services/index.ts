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
      console.log("Timesheet was submitted.");
      await notifySafely("Timesheet submitted successfully.");
    } else {
      console.log("Timesheet was already submitted.");
    }
  } catch (error) {
    primaryError = error;
    
    const message = error instanceof Error ? error.message : String(error);
    console.error("Timesheet submission failed:", message);
    await notifySafely(`Timesheet submission failed: ${message}`);

    throw error;
  } finally {
    try {
      await sageService.close();
    } catch (closeError) {
      console.error(
        "Failed to close browser:",
        closeError instanceof Error ? closeError.message : String(closeError),
      );
      if (!primaryError) primaryError = closeError;
    }
  }

  if (primaryError) throw primaryError;
};
