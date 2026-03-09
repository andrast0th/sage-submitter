# SageSubmitter

Automates monthly timesheet submission on [Sage HR](https://www.sage.hr/) using headless Chrome (Puppeteer). Designed to run on a schedule — it signs in, navigates to the timesheets page, verifies the correct month is selected, clicks Submit, confirms the modal, and verifies the "Withdraw timesheet" button appears to confirm success. Sends Telegram notifications on success or failure.

## How it works

1. **Date guard** — on each run, the script calculates the Nth working day before the end of the month. If today isn't that day (and `BYPASS_DATE_CHECK` isn't set), it exits immediately. The day before the trigger date, it sends a Telegram reminder instead of submitting.
2. **Browser automation** — launches headless Chrome, signs into Sage HR, and navigates to the timesheets page.
3. **Safety checks** — verifies the selected period dropdown matches the current month before touching anything.
4. **Submission** — clicks the Submit button, confirms the modal dialog, then polls for the "Withdraw timesheet" button to confirm the submission actually went through.
5. **Already submitted** — if the "Withdraw timesheet" button is already visible, the script exits cleanly without doing anything.
6. **Notifications** — sends a Telegram message on success or failure (silently skipped if Telegram credentials are not configured).

## Prerequisites

- Node.js 18+
- Google Chrome installed (path configurable via `CHROME_PATH`)
- A Sage HR account
- (Optional) A Telegram bot for notifications

## Setup

```bash
git clone https://your-repo-url.git
cd sage-submitter
npm install
cp .env.example .env
# edit .env with your credentials
npm run build
```

## Configuration

| Variable                | Required | Default                                           | Description                                                            |
| ----------------------- | -------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| `SAGE_EMAIL`            | ✅       | —                                                 | Sage HR login email                                                    |
| `SAGE_PASSWORD`         | ✅       | —                                                 | Sage HR login password                                                 |
| `SAGE_BASE_URL`         | ✅       | —                                                 | Base URL of your Sage HR instance (e.g. `https://yourcompany.sage.hr`) |
| `DAYS_BEFORE_MONTH_END` |          | `4`                                               | How many working days before month end the script submits              |
| `BYPASS_DATE_CHECK`     |          | `false`                                           | Set to `true` to run regardless of the date (useful for local testing) |
| `HEADLESS`              |          | `true`                                            | Set to `false` to watch Chrome run (useful for debugging)              |
| `CHROME_PATH`           |          | `/Applications/Google Chrome.app/…/Google Chrome` | Path to the Chrome executable                                          |
| `TELEGRAM_BOT_TOKEN`    |          | —                                                 | Telegram bot token for notifications                                   |
| `TELEGRAM_CHAT_ID`      |          | —                                                 | Telegram chat ID to send notifications to                              |

## Running

```bash
# Build and run once (respects date guard)
npm run dev

# Run the compiled output
npm start

# Force a submission regardless of date (local testing)
BYPASS_DATE_CHECK=true npm run dev
```

## Cron job setup

The script includes a built-in date guard so it safely runs daily — it will skip non-target days automatically.

**Option 1 — Run every weekday (simplest):**

```bash
# Runs at 9am every weekday; the script skips non-target days on its own
0 9 * * 1-5 cd /path/to/sage-submitter && npm start
```

**Option 2 — Run only in the last days of the month (more efficient):**

```bash
# For DAYS_BEFORE_MONTH_END=4, run on days 24–31 to cover the trigger & reminder days
# Adjust the start day if you change DAYS_BEFORE_MONTH_END (use ~last N+4 calendar days as buffer)
0 9 24-31 * 1-5 cd /path/to/sage-submitter && npm start
```

> Option 2 saves unnecessary runs but requires manual adjustment if you change `DAYS_BEFORE_MONTH_END`. The buffer of N+4 calendar days accounts for weekends shifting working days earlier.

## Project structure

```
src/
├── index.ts                  # Entry point — date guard, reminder, trigger
├── config/index.ts           # Loads and validates env config
├── services/
│   ├── index.ts              # Orchestrates the full submission flow
│   ├── sageService.ts        # Puppeteer automation for Sage HR
│   └── telegramService.ts    # Telegram notification helper
└── utils/index.ts            # Working-day date calculations
```

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for discussion.

## License

This project is licensed under the MIT License.
