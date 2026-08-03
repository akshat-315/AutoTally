<div align="center">
  <img src="dashboard/public/logo.png" alt="AutoTally" width="96" />
  <h1>AutoTally</h1>
  <p><i>Tracking expenses shouldn't require typing.</i></p>
</div>

---

Every UPI payment and card swipe in India already sends you an SMS. That SMS has the
amount, the merchant, the date and the reference number in it. AutoTally reads those
messages off your phone and turns them into a categorised expense ledger — no app to
open, no receipts to photograph, nothing to type.

It runs entirely on hardware you control. Your transaction history never leaves your
server.

## How it works

```
   ┌──────────────┐
   │  Your phone  │  Termux agent reads new bank SMS
   │   (Termux)   │  and forwards them over HTTP
   └──────┬───────┘
          │  POST /api/v1/sms/ingest
          ▼
   ┌──────────────────────────────────────────────┐
   │              FastAPI server                  │
   │                                              │
   │   recognise bank format  →  extract fields   │
   │           ↓                                  │
   │   match merchant  →  apply category          │
   │           ↓                                  │
   │        save to SQLite                        │
   └──────┬────────────────────────────┬──────────┘
          │                            │
          ▼                            ▼
   ┌──────────────┐            ┌───────────────┐
   │ Telegram bot │            │   Dashboard   │
   │              │            │    (React)    │
   │ live alerts, │            │               │
   │ summaries,   │            │ charts, drill │
   │ quick tags   │            │ downs, search │
   └──────────────┘            └───────────────┘
```

A payment happens, the SMS arrives, and within one polling cycle you get a Telegram
notification with the amount, merchant and category — plus buttons to fix the category
if it guessed wrong. Everything accumulates in the dashboard.

## The three pieces

### Phone agent — `termux/`

A small Python script that runs inside [Termux](https://termux.dev) on Android. It
reads the SMS inbox, sends only the messages the server hasn't seen yet, and remembers
where it left off.

If your server is down or the phone is offline, it queues the messages on disk and
flushes them on the next run. Nothing is lost, and nothing is sent twice.

### Server — `server/`

A FastAPI service that does the actual work.

**Recognising messages.** Bank SMS formats live in a YAML file as readable templates,
not as code. Each template says which bank it belongs to, whether it's money in or
money out, and where the amount, merchant, date and reference sit inside the message.
Anything that doesn't match a known format is counted and ignored rather than treated
as an error — your inbox is full of OTPs and promotions, and that's expected.

**Figuring out who you paid.** Bank messages name the same merchant a dozen different
ways. The server resolves each one against the merchants it already knows — by UPI
address first, then by name — so a merchant you've categorised once stays categorised,
and close variants of a known name inherit its category automatically.

**Categorising.** Categories are yours to define. You correct the ones it gets wrong,
and it stops asking. Correct a merchant a few times and it's treated as settled — from
then on it's applied without prompting, and past transactions from that merchant are
backfilled too. A category set on a single transaction always wins over the
merchant-level rule, so a one-off doesn't pollute the pattern.

### Interfaces

**Telegram bot** — the day-to-day surface. Every new transaction arrives as a message
with inline buttons to set or change its category. `/today`, `/week`, `/month` and
`/year` give you a spend summary broken down by category without opening anything.
`/uncategorized` shows what still needs a decision.

**Dashboard** — the reflective surface. Spend over time, breakdown by category, top
merchants, and drill-down pages for any category or merchant. The transactions view
filters by date, direction, bank, category, merchant, amount range and free-text
search. Responsive, with a mobile tab bar and a desktop sidebar.

## Design notes

- **New banks are a config change, not a code change.** Add a template to
  `server/services/sms/sms_templates.yaml` and restart. No parser to write.
- **Ingestion is safe to repeat.** Every transaction is keyed to its source message,
  so re-running the phone agent or replaying a queue can't create duplicates.
- **A bad message doesn't stop a batch.** Each message is processed independently;
  unrecognised, duplicate and failed ones are counted separately and reported back in
  the response.
- **Categorisation learns instead of interrogating.** The system asks about a merchant
  until you've settled it, then stops.
- **One container, one port.** The dashboard is built and baked into the server image,
  so the whole system is a single service behind a single port.

## Stack

FastAPI · SQLAlchemy (async) · SQLite · React 19 · TypeScript · Vite · Tailwind CSS ·
Recharts · python-telegram-bot · Docker

## Running it

**Server**

```bash
cp .env.example .env      # fill in the values below
docker compose up -d
```

| Variable | What it's for |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/botfather). Leave blank to run without the bot. |
| `TELEGRAM_CHAT_ID` | Your chat ID — the bot only talks to this one. |
| `ALLOWED_ORIGINS` | Comma-separated origins for the dashboard. `http://localhost:5173` for local dev. |

The server listens on `127.0.0.1:8001`, with the database and logs persisted to
`./data`. `nginx/autotally.aksht.dev` is a working reverse-proxy config if you're
putting it on a domain.

**Phone**

```bash
pkg install termux-api python
pip install requests
cp termux/config.example.json termux/config.json   # set server_url
python termux/main.py
```

Run it on whatever schedule suits you — Termux's job scheduler or a cron entry. Each
run picks up where the last one stopped.

**Local development**

```bash
cd server && pip install -r requirements.txt && make run   # :8001
cd dashboard && npm install && npm run dev                 # :5173, proxies /api
```

## Adding a new bank

Open `server/services/sms/sms_templates.yaml`. Add an entry keyed on the SMS sender ID
your bank uses, then paste in a real message from that bank with the variable parts
swapped for `{amount}`, `{merchant}`, `{date}`, `{vpa}`, `{upi_ref}` and `{last4}`.
Mark it `debit` or `credit`. Restart the server — that's the whole process.

## Repo layout

```
termux/        Android-side SMS agent
server/        FastAPI backend
  routers/       HTTP endpoints
  services/      SMS parsing, Telegram bot
  database/      models and queries
dashboard/     React dashboard
nginx/         reverse-proxy config
```
