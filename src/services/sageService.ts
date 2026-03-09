import puppeteer, { Browser, ElementHandle, Page } from "puppeteer-core";
import config from "../config";

export class SageService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Launch headless Chrome and create a page.
   */
  async init(): Promise<void> {
    console.log("Launching headless Chrome...");
    this.browser = await puppeteer.launch({
      executablePath: config.chromePath,
      headless: config.headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1920,1080",
      ],
      defaultViewport: null,
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );
    console.log("Browser ready.");
  }

  /**
   * Navigate to the sign-in page, fill in credentials, and submit the form.
   */
  async signIn(): Promise<void> {
    if (!this.page)
      throw new Error("Browser not initialized. Call init() first.");

    const signinUrl = `${config.sage.baseUrl}/signin`;
    console.log(`Navigating to: ${signinUrl}`);
    await this.page.goto(signinUrl, { waitUntil: "networkidle2" });

    // Fill in email
    console.log("Filling in email...");
    await this.page.waitForSelector("#user_email");
    await this.page.type("#user_email", config.sage.email, { delay: 50 });

    // Fill in password
    console.log("Filling in password...");
    await this.page.waitForSelector("#user_password");
    await this.page.type("#user_password", config.sage.password, { delay: 50 });

    // Submit the form
    console.log("Submitting sign-in form...");
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: "networkidle2" }),
      this.page.$eval("#new_user", (form) =>
        (form as HTMLFormElement).submit(),
      ),
    ]);

    console.log(`Signed in. Current URL: ${this.page.url()}`);
  }

  /**
   * From the dashboard, click the Timesheets menu button.
   */
  async navigateToTimesheets(): Promise<void> {
    if (!this.page)
      throw new Error("Browser not initialized. Call init() first.");

    // Verify we landed on the dashboard
    await this.page.waitForFunction(
      () => window.location.pathname.includes("/dashboard"),
      { timeout: 10000 },
    );
    console.log("Dashboard loaded.");

    // Click the Timesheets menu button
    console.log('Clicking "Timesheets" menu...');
    await this.page.waitForSelector("#main_menu_timesheets", { visible: true });
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: "networkidle2" }),
      this.page.click("#main_menu_timesheets"),
    ]);

    console.log(`Timesheets page loaded. Current URL: ${this.page.url()}`);
  }

  /**
   * Verify the currently selected timesheet period matches the current month.
   * Reads the selected <option> value from the period dropdown (format: YYYY-MM-01).
   */
  async verifyCurrentMonth(): Promise<void> {
    if (!this.page)
      throw new Error("Browser not initialized. Call init() first.");

    console.log("Verifying selected period matches current month...");

    const selectedValue = await this.page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>(
        "select#date.timesheets-manager-date-select",
      );
      return select?.value ?? null;
    });

    if (!selectedValue) {
      throw new Error(
        "Could not read the selected period from the dropdown. The UI may have changed.",
      );
    }

    // selectedValue is in YYYY-MM-DD format (e.g. "2026-03-01")
    const [yearStr, monthStr] = selectedValue.split("-");
    const selectedYear = parseInt(yearStr, 10);
    const selectedMonth = parseInt(monthStr, 10);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed

    console.log(
      `Selected period: ${selectedYear}-${String(selectedMonth).padStart(2, "0")} | Current: ${currentYear}-${String(currentMonth).padStart(2, "0")}`,
    );

    if (selectedYear !== currentYear || selectedMonth !== currentMonth) {
      throw new Error(
        `Selected period (${selectedYear}-${String(selectedMonth).padStart(2, "0")}) does not match the current month (${currentYear}-${String(currentMonth).padStart(2, "0")}). Aborting submission.`,
      );
    }

    console.log("Period matches current month. Proceeding.");
  }

  /**
   * Returns true if the "Withdraw timesheet" button is currently visible,
   * which indicates the timesheet has already been submitted.
   */
  async hasWithdrawButton(): Promise<boolean> {
    if (!this.page)
      throw new Error("Browser not initialized. Call init() first.");

    return this.page.evaluate(() => {
      const container = document.querySelector("#vue-timesheets-manager");
      if (!container) return false;

      // Check for "Withdraw timesheet" button by title
      if (container.querySelector('button[title="Withdraw timesheet"]'))
        return true;

      // Check for secondary-button with "withdraw" text
      const buttons = container.querySelectorAll("button");
      for (const btn of buttons) {
        if (btn.textContent?.trim().toLowerCase().includes("withdraw"))
          return true;
      }

      return false;
    });
  }

  /**
   * Find and click the Submit button on the timesheets page.
   * Uses a prioritised list of selectors to be resilient to UI changes.
   */
  async submitTimesheet(): Promise<boolean> {
    if (!this.page)
      throw new Error("Browser not initialized. Call init() first.");

    // Wait for the timesheets Vue app to be present
    await this.page.waitForSelector("#vue-timesheets-manager", {
      timeout: 10000,
    });
    console.log("Timesheets manager loaded.");

    // Verify the selected period is the current month before submitting
    await this.verifyCurrentMonth();

    // Check if the timesheet is already submitted
    const alreadySubmitted = await this.hasWithdrawButton();
    if (alreadySubmitted) {
      console.log(
        "Timesheet for this period is already submitted. Nothing to do.",
      );
      return false;
    }

    console.log("Waiting for Submit button...");

    // Wait for the Submit button to appear (Vue app renders async)
    await this.page.waitForFunction(
      () => {
        const container = document.querySelector("#vue-timesheets-manager");
        if (!container) return false;

        // Check class-based selector
        if (container.querySelector("button.submit-button")) return true;

        // Check title-based selector
        if (container.querySelector('button[title="Submit"]')) return true;

        // Check text content
        const buttons = container.querySelectorAll("button");
        for (const btn of buttons) {
          if (btn.textContent?.trim().toLowerCase() === "submit") return true;
        }
        return false;
      },
      { timeout: 30000, polling: 500 },
    );
    console.log("Submit button appeared.");

    // Now find and return the button
    const submitButton = await this.page.evaluateHandle(() => {
      const strategies: (() => HTMLElement | null)[] = [
        // 1. Button with class 'submit-button' inside the timesheets manager
        () =>
          document.querySelector(
            "#vue-timesheets-manager button.submit-button",
          ) as HTMLElement | null,

        // 2. Button with title="Submit" inside the timesheets manager
        () =>
          document.querySelector(
            '#vue-timesheets-manager button[title="Submit"]',
          ) as HTMLElement | null,

        // 3. Any button containing text "Submit" inside the timesheets manager
        () => {
          const container = document.querySelector("#vue-timesheets-manager");
          if (!container) return null;
          const buttons = container.querySelectorAll("button");
          for (const btn of buttons) {
            if (btn.textContent?.trim().toLowerCase() === "submit") return btn;
          }
          return null;
        },

        // 4. Fallback: any .submit-button on the page
        () =>
          document.querySelector("button.submit-button") as HTMLElement | null,
      ];

      for (const strategy of strategies) {
        const el = strategy();
        if (el) return el;
      }
      return null;
    });

    const element =
      submitButton.asElement() as ElementHandle<HTMLElement> | null;
    if (!element) {
      throw new Error(
        "Could not find the Submit button on the timesheets page. The UI may have changed.",
      );
    }

    console.log('Clicking "Submit" button...');
    await element.click();
    console.log("Timesheet submit initiated.");

    // Confirm submission in the modal dialog
    await this.confirmSubmitModal();

    // Final sanity-check: the Submit button should now be replaced by "Withdraw timesheet"
    await this.verifyWithdrawButtonAppears();

    console.log("Timesheet submitted.");
    return true;
  }

  /**
   * Wait for the "Withdraw timesheet" button to appear, confirming the submission succeeded.
   * Throws if it doesn't appear within the timeout.
   */
  private async verifyWithdrawButtonAppears(): Promise<void> {
    if (!this.page)
      throw new Error("Browser not initialized. Call init() first.");

    console.log(
      'Waiting for "Withdraw timesheet" button to confirm submission...',
    );

    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (await this.hasWithdrawButton()) {
        console.log(
          '"Withdraw timesheet" button appeared. Submission confirmed.',
        );
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(
      'Submission may have failed: "Withdraw timesheet" button did not appear within 15 seconds.',
    );
  }

  /**
   * After the initial submit, a confirmation modal appears with its own Submit button.
   * Uses Carbon design system data-* attributes for resilient selectors.
   */
  private async confirmSubmitModal(): Promise<void> {
    if (!this.page)
      throw new Error("Browser not initialized. Call init() first.");

    console.log("Waiting for confirmation modal...");

    // Try multiple selectors for the modal - Carbon UI may use different attributes
    const modalSelectors = [
      '[data-role="modal"][data-state="open"]',
      '[data-component="dialog"][data-state="open"]',
      '[role="dialog"][aria-modal="true"]',
      '[data-role="modal"]',
      '[data-component="dialog"]',
    ];

    let modalFound = false;
    for (const selector of modalSelectors) {
      try {
        await this.page.waitForSelector(selector, {
          visible: true,
          timeout: 5000,
        });
        console.log(`Confirmation modal detected with: ${selector}`);
        modalFound = true;
        break;
      } catch {
        // selector didn't match, try next
      }
    }

    if (!modalFound) {
      throw new Error(
        "Could not find the confirmation modal after trying all selectors.",
      );
    }

    // Find the Submit button inside the modal using prioritised strategies
    const modalSubmit = await this.page.evaluateHandle(() => {
      const modal = document.querySelector(
        '[data-role="modal"][data-state="open"]',
      );
      if (!modal) return null;

      const strategies: (() => HTMLElement | null)[] = [
        // 1. Carbon form-summary area button (most specific to this modal)
        () => {
          const summary = modal.querySelector('[data-element="form-summary"]');
          if (!summary) return null;
          return summary.querySelector("button") as HTMLElement | null;
        },

        // 2. Button inside the form footer that contains text "Submit"
        () => {
          const footer = modal.querySelector('[data-role="form-footer"]');
          if (!footer) return null;
          const buttons = footer.querySelectorAll("button");
          for (const btn of buttons) {
            if (btn.textContent?.trim().toLowerCase() === "submit") return btn;
          }
          return null;
        },

        // 3. Any button with data-component="button" containing "Submit" text
        () => {
          const buttons = modal.querySelectorAll(
            'button[data-component="button"]',
          );
          for (const btn of buttons) {
            if (btn.textContent?.trim().toLowerCase() === "submit")
              return btn as HTMLElement;
          }
          return null;
        },

        // 4. Broadest: any button in the modal with "Submit" text
        () => {
          const buttons = modal.querySelectorAll("button");
          for (const btn of buttons) {
            if (btn.textContent?.trim().toLowerCase() === "submit") return btn;
          }
          return null;
        },
      ];

      for (const strategy of strategies) {
        const el = strategy();
        if (el) return el;
      }
      return null;
    });

    const modalBtn =
      modalSubmit.asElement() as ElementHandle<HTMLElement> | null;
    if (!modalBtn) {
      throw new Error(
        "Could not find the Submit button in the confirmation modal. The UI may have changed.",
      );
    }

    console.log('Clicking modal "Submit" button...');
    await modalBtn.click();

    // Wait for the submission to process
    await this.page.waitForNetworkIdle({ timeout: 10000 });
    console.log("Modal submission confirmed.");
  }

  /**
   * Clean up browser resources.
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log("Browser closed.");
    }
  }
}
