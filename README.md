# API Trading Bot

A production-ready **Binance Futures trading backend** built with Fastify and TypeScript. Acts as a secure proxy between the frontend and Binance — API keys never touch the browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Fastify 5 |
| Language | TypeScript 6 |
| Database | MongoDB (Mongoose) |
| Auth | JWT + httpOnly cookies |
| AI | Google Gemini, Anthropic Claude |
| Docs | Swagger UI (`/docs`) |
| Process Manager | PM2 |

---

## Features

- **Two authentication flows** — sign in with Binance API keys directly, or register an account with email/password that stores keys server-side
- **Testnet / live switching** — toggle between Binance Testnet and production per session without re-authenticating
- **Anonymous session support** — unauthenticated users can use the AI chat; history merges seamlessly on sign-in
- **Futures trading** — place market/limit orders, set TP/SL, close positions, cancel orders
- **User data stream** — manage Binance `listenKey` lifecycle (start, keep-alive, close)
- **AI chat (Claude)** — server-side conversation history per session (authenticated or anonymous)
- **AI market analysis** — send a symbol + interval to get an AI-generated analysis via Gemini or Claude
- **AI trade bot** — automated trade execution driven by Gemini's market analysis
- **Rate limiting** — per-route limits (e.g. sign-in: 3 req/min)
- **Security** — Helmet, CORS with credentials, signed cookies, bcrypt password hashing

---

## Architecture

```
Angular Frontend (port 4444)
        ↓  HTTP + httpOnly cookie
Fastify API (port 5555)
        ↓
   ┌────┴────────────┐
Binance API      MongoDB Atlas
(Futures)        (users, conversations)
```

---

## Environment Setup

Create a `.env` file in the project root:

```env
PORT=5555

# Sign JWT session tokens (min 16 chars, keep secret)
JWT_SECRET="your_jwt_secret_here"

# Sign httpOnly cookies (min 16 chars, keep secret)
COOKIE_SECRET="your_cookie_secret_here"

# MongoDB Atlas connection string
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority"

# Angular frontend origin (CORS credentials)
CLIENT_ORIGIN="http://localhost:4444"

# Google Gemini API key
GEMINI_API_KEY="your_gemini_api_key"

# Anthropic Claude API key
CLAUDE_API_KEY="your_claude_api_key"
```

---

## Installation

```bash
git clone https://github.com/Kryuzaki18/api-trading-bot.git
cd api-trading-bot
npm install
```

---

## Running

```bash
# Development (hot reload)
npm run dev

# Production build
npm run build
npm run start

# PM2 (production)
npm run pm2:start-prod

# PM2 commands
npm run pm2:logs
npm run pm2:status
npm run pm2:restart
npm run pm2:stop
```

Server runs at `http://localhost:5555`  
Swagger docs at `http://localhost:5555/docs`

---

## API Endpoints

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register with email, password, and Binance keys (test + prod) |
| `POST` | `/api/auth/signin` | Sign in with Binance API key + secret directly |
| `POST` | `/api/auth/signin-email` | Sign in with email + password |
| `POST` | `/api/auth/signout` | Clear session cookie |
| `GET` | `/api/auth/me` | Check if current session is valid |
| `POST` | `/api/auth/switch-mode` | Toggle testnet ↔ live, refreshes session cookie |

### Futures Orders

All routes require a valid session cookie.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/futures/positions` | Open futures positions |
| `GET` | `/api/futures/open-orders` | Pending limit/stop orders |
| `GET` | `/api/futures/pending-tpsl` | Pending TP/SL algo orders |
| `POST` | `/api/futures/order` | Place a market or limit order |
| `POST` | `/api/futures/take-profit` | Place a Take Profit order |
| `POST` | `/api/futures/stop-loss` | Place a Stop Loss order |
| `POST` | `/api/futures/close-position` | Close position at market price |
| `POST` | `/api/futures/cancel` | Cancel a pending order |
| `POST` | `/api/futures/cancel-tpsl` | Cancel a TP/SL algo order |
| `POST` | `/api/futures/leverage-bracket` | Get leverage brackets for a symbol |
| `POST` | `/api/futures/commission-rate` | Get commission rates for symbols |

### User Data Stream

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/user-stream` | Start a user data stream, returns `listenKey` |
| `PUT` | `/api/user-stream` | Keep-alive ping (call every 30 min) |
| `DELETE` | `/api/user-stream` | Close the stream |

### AI — Claude (server-side history)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/claude/chat` | Chat with Claude (history managed per session) |
| `GET` | `/api/claude/history` | Get current session's chat history |
| `DELETE` | `/api/claude/history` | Clear current session's chat history |
| `POST` | `/api/claude/analyze-market` | AI market analysis for a symbol + interval |

### AI — Gemini (stateless)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Chat with Gemini (history passed by client) |
| `POST` | `/api/analyze-market` | Gemini market analysis for a symbol + interval |

### Trade Bot

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/trade-bot` | Analyze market with Gemini and auto-execute a trade |

### User

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/user-info` | Get current authenticated user's account info |

---

## Security Notes

- API keys are stored in the session JWT inside a signed httpOnly cookie — never sent as a request header from the frontend
- Passwords are hashed with bcrypt (salt rounds: 12)
- Sign-in endpoints are rate-limited to 3 requests per minute
- Anonymous sessions use a separate cookie so history is never mixed with authenticated sessions
- Always use a strong, unique `JWT_SECRET` and `COOKIE_SECRET` in production
- Disable withdrawals and restrict by IP on your Binance API key

---

## Disclaimer

This project is for **educational purposes only**. Cryptocurrency trading involves significant financial risk. Use Binance Testnet for safe development and testing.

---

## Author

**Kryuzaki18**
