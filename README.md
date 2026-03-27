# 🚀 API Trading Bot

A **production-ready cryptocurrency trading backend API** built with Node.js, designed for real-time trading, automation, and seamless frontend integration (Angular, React, etc.).

> ⚡ Powered by Binance Futures API
> 🔐 Secure by design (no API keys exposed to frontend)
> 📊 Real-time ready via WebSocket

---

# 📌 Features

- ⚡ Real-time market data (WebSocket)
- 📈 Futures trading (BUY / SELL orders)
- 🔐 Secure API key handling via backend
- 📊 REST endpoints for account & pricing
- 🔄 Auto-reconnect WebSocket support
- 🧱 Modular and scalable architecture
- 📄 Swagger API documentation

---

# 🧱 Tech Stack

- **Backend:** Node.js, Fastify
- **Language:** TypeScript
- **API:** Binance Futures
- **Realtime:** WebSocket
- **Docs:** Swagger (OpenAPI 3.0)

---

# ⚙️ Architecture

```
Frontend (Angular / React)
        ↓
Backend API (Node.js)
        ↓
Binance API (Futures)
```

---

# 🔑 Environment Setup

Create a `.env` file:

```
JWT_SECRET="changeme_to_a_super_strong_random_string"
PORT=3000
```

---

# 📦 Installation

```
git clone https://github.com/Kryuzaki18/api-trading-bot.git
cd api-trading-bot
npm install
```

---

# ▶️ Run

```
npm run dev
```

Server runs at:

```
http://localhost:3000
```

---

# 📄 Swagger API Documentation

## 🔧 Install Swagger

```
npm install swagger-ui-express swagger-jsdoc
```

---

## 📁 Create Swagger Config

### `src/swagger.ts`

```ts
import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Trading Bot API",
      version: "1.0.0",
      description: "API for Binance Futures Trading Bot",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
});
```

---

## 📁 Setup Swagger UI

### `server.ts`

```ts
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

---

## 🌐 Access Docs

```
http://localhost:3000/api-docs
```

---

# 📡 API Endpoints

---

## 🔹 Account

```
GET /api/account
```

**Description:** Get futures account balance

---

## 🔹 Place Order

```
POST /api/order
```

### Body:

```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "quantity": 0.001
}
```

---

## 🔹 Get Price

```
GET /api/price?symbol=BTCUSDT
```

---

# 📄 Swagger Annotations Example

### `routes/order.ts`

```ts
/**
 * @swagger
 * /api/order:
 *   post:
 *     summary: Place a futures order
 *     tags: [Order]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: BTCUSDT
 *               side:
 *                 type: string
 *                 example: BUY
 *               quantity:
 *                 type: number
 *                 example: 0.001
 *     responses:
 *       200:
 *         description: Order placed successfully
 */
```

---

# ⚡ WebSocket (Real-Time Data)

## Endpoint

```
wss://fstream.binance.com/ws/btcusdt@trade
```

---

## Example Message

```json
{
  "e": "trade",
  "p": "67250.12"
}
```

---

## Important

- Price is a **string**
- Always convert:

```ts
parseFloat(data.p);
```

---

# 🔐 Security Best Practices

- ❌ Never expose API keys in frontend
- ✅ Use `.env` variables
- ✅ Disable withdrawals on Binance API key
- ✅ Restrict API key by IP

---

# 🧪 Development Tips

- Use Binance **Testnet** for safe testing
- Avoid REST polling → use WebSocket
- Implement retry & reconnect logic

---

# 🚀 Portfolio-Level Improvements

## ✅ Logging (Winston)

```
npm install winston
```

---

## ✅ Rate Limiting

```
npm install fastify-rate-limit
```

---

## ✅ Docker

### `Dockerfile`

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "run", "dev"]
```

---

## ✅ Combined WebSocket Stream

```
wss://fstream.binance.com/stream?streams=btcusdt@trade/ethusdt@trade
```

---

# 📊 Example Use Cases

- Trading Dashboard (Angular)
- Automated Trading Bot
- Signal-based Trading System
- Portfolio Tracker

---

# ⚠️ Disclaimer

This project is for **educational purposes only**.
Trading cryptocurrency involves risk.

---

# 👨‍💻 Author

**Kryuzaki18**

---

# ⭐ Support

If you find this useful:

- ⭐ Star the repo
- 🍴 Fork it
- 🧠 Contribute

---

# 💡 Final Thoughts

This project demonstrates:

- Real-time systems (WebSocket)
- Secure backend architecture
- Financial API integration

👉 Perfect for **portfolio + real-world trading systems**

---

## 🔥 Next Steps (Optional Enhancements)

- 📊 Add charting (TradingView / ECharts)
- 🧠 Implement trading strategies (EMA, RSI)
- 🤖 Add AI-based signal engine
- 📈 Build full Angular dashboard

---
