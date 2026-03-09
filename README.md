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

## Docker

The recommended way to run SageSubmitter on a server. Uses a `node:20-slim` base with Chromium from apt (~500 MB vs ~2 GB for the full puppeteer image) — no separate Chrome install needed.

**Build:**

```bash
docker build -t sage-submitter .
```

**Run (passing credentials at runtime — never bake them into the image):**

```bash
docker run --rm \
  -e SAGE_BASE_URL=https://yourcompany.sage.hr \
  -e SAGE_EMAIL=your@email.com \
  -e SAGE_PASSWORD=yourpassword \
  -e DAYS_BEFORE_MONTH_END=4 \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e TELEGRAM_CHAT_ID=your_chat_id \
  sage-submitter
```

Or store credentials in an env file on the server (not committed to the repo) and reference it:

```bash
docker run --rm --env-file /etc/sage-submitter/prod.env sage-submitter
```

> `CHROME_PATH` and `HEADLESS=true` are already set inside the image — no need to pass them.

## Cron job setup

The script includes a built-in date guard so it safely runs daily — it will skip non-target days automatically.

**Docker (recommended for server deployments):**

```bash
# Option 1 — daily, simplest
0 9 * * 1-5 docker run --rm --env-file /etc/sage-submitter/prod.env sage-submitter

# Option 2 — only last days of the month (adjust start day for your DAYS_BEFORE_MONTH_END)
0 9 24-31 * 1-5 docker run --rm --env-file /etc/sage-submitter/prod.env sage-submitter
```

**Without Docker (local/bare-metal):**

```bash
0 9 * * 1-5 cd /path/to/sage-submitter && npm start
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
