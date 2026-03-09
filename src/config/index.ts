import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["SAGE_EMAIL", "SAGE_PASSWORD", "SAGE_BASE_URL"] as const;
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const config = {
  daysBeforeMonthEnd: parseInt(process.env.DAYS_BEFORE_MONTH_END || "4", 10),
  bypassDateCheck: process.env.BYPASS_DATE_CHECK === "true",
  headless: process.env.HEADLESS !== "false",
  chromePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  sage: {
    baseUrl: process.env.SAGE_BASE_URL as string,
    email: process.env.SAGE_EMAIL as string,
    password: process.env.SAGE_PASSWORD as string,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },
};

export default config;
