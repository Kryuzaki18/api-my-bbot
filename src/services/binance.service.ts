import { createHmac } from "crypto";
import { request } from "undici";
import {
  BINANCE_FUTURES_PROD_URL,
  BINANCE_FUTURES_TESTNET_URL,
  BINANCE_ENDPOINTS,
} from "../config/api-binance.js";
import {
  type OrderParams,
  type TPSLParams,
  type CancelOrderParams,
  OrderType,
  TimeInForce,
  OrderSide,
  type CancelTpSlParams,
} from "../models/order.model.js";

export class BinanceService {
  private exchangeInfoCache: Record<string, any> = {};
  private timeOffset: number = 0;

  private getBaseUrl(useTestnet: boolean) {
    return useTestnet ? BINANCE_FUTURES_TESTNET_URL : BINANCE_FUTURES_PROD_URL;
  }

  private async syncTime(useTestnet: boolean) {
    const baseUrl = this.getBaseUrl(useTestnet);
    const start = Date.now();

    const res = await request(`${baseUrl}${BINANCE_ENDPOINTS.FUTURES_TIME}`);
    const data = (await res.body.json()) as { serverTime: number };

    const end = Date.now();
    const avgLocalTime = (start + end) / 2;

    this.timeOffset = data.serverTime - avgLocalTime - 1000;
  }

  private async makeSignedRequest(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
    method: "GET" | "POST" | "DELETE",
    endpoint: string,
    queryParams: Record<string, string | number | boolean> = {},
  ) {
    const baseUrl = this.getBaseUrl(useTestnet);

    if (this.timeOffset === 0) {
      await this.syncTime(useTestnet);
    }

    queryParams.timestamp = Math.floor(Date.now() + this.timeOffset);

    const queryString = new URLSearchParams(queryParams as any).toString();
    const signature = createHmac("sha256", apiSecret)
      .update(queryString)
      .digest("hex");

    const finalUrl = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    const { statusCode, body, headers } = await request(finalUrl, {
      method,
      headers: { "X-MBX-APIKEY": apiKey },
    });

    const contentType = headers["content-type"] || "";
    let responseData;

    if (contentType.includes("application/json")) {
      responseData = await body.json();
    } else {
      const text = await body.text();
      throw new Error(`Binance API Error: ${text.substring(0, 100)}`);
    }

    if (statusCode !== 200) {
      throw Object.assign(new Error("Binance API Error"), {
        status: statusCode,
        details: responseData,
      });
    }

    return responseData;
  }

  private async makeApiRequest(
    apiKey: string,
    useTestnet: boolean,
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
  ) {
    const baseUrl = this.getBaseUrl(useTestnet);

    const { statusCode, body } = await request(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        "X-MBX-APIKEY": apiKey,
        "Content-Type": "application/json",
      },
    });

    const responseData = await body.json();

    if (statusCode !== 200) {
      throw Object.assign(new Error("Binance API Error"), {
        status: statusCode,
        details: responseData,
      });
    }

    return responseData;
  }

  private async getExchangeInfo(useTestnet: boolean) {
    const cacheKey = useTestnet ? "testnet" : "mainnet";
    if (!this.exchangeInfoCache[cacheKey]) {
      this.exchangeInfoCache[cacheKey] = await this.makeApiRequest(
        "",
        useTestnet,
        "GET",
        BINANCE_ENDPOINTS.FUTURES_EXCHANGE_INFO,
      );
    }
    return this.exchangeInfoCache[cacheKey];
  }

  private async applyExchangeFilters(params: any, useTestnet: boolean) {
    try {
      const info = await this.getExchangeInfo(useTestnet);
      const symbolInfo = info.symbols.find(
        (s: any) => s.symbol.toUpperCase() === params.symbol.toUpperCase(),
      );
      if (!symbolInfo) return;

      const lotSizeFilter = symbolInfo.filters.find(
        (f: any) => f.filterType === "LOT_SIZE",
      );
      if (lotSizeFilter && params.quantity !== undefined) {
        params.quantity = this.roundToTickSize(
          params.quantity,
          lotSizeFilter.stepSize,
        );
        if (params.quantity <= 0) {
          throw Object.assign(
            new Error(
              `Order quantity is too small. The minimum allowed step size for ${params.symbol} is ${lotSizeFilter.stepSize}. Please increase your USD amount.`,
            ),
            { status: 400 },
          );
        }
      }

      const priceFilter = symbolInfo.filters.find(
        (f: any) => f.filterType === "PRICE_FILTER",
      );
      if (priceFilter) {
        if (params.price !== undefined) {
          params.price = this.roundToTickSize(
            params.price,
            priceFilter.tickSize,
          );
        }
        if (params.stopPrice !== undefined) {
          params.stopPrice = this.roundToTickSize(
            params.stopPrice,
            priceFilter.tickSize,
          );
        }
      }
    } catch (e: any) {
      if (e.status === 400) throw e;
      console.warn("Failed to fetch/apply exchange info filters:", e);
    }
  }

  private roundToTickSize(price: number, tickSize: string): number {
    const tickSizeNum = parseFloat(tickSize);
    if (tickSizeNum <= 0) return price;

    const precision = Math.log10(1 / tickSizeNum);
    return Number(price.toFixed(precision));
  }

  private async setLeverage(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
    symbol: string,
    leverage: number,
  ) {
    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      useTestnet,
      "POST",
      BINANCE_ENDPOINTS.FUTURES_LEVERAGE,
      {
        symbol,
        leverage,
      },
    );
  }

  async getLeverageBracket(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
    symbol?: string,
  ) {
    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      useTestnet,
      "GET",
      BINANCE_ENDPOINTS.FUTURES_LEVERAGE_BRACKET,
      {
        symbol: symbol || "",
      },
    );
  }

  async getCommissionRate(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
    symbols?: string[],
  ) {
    const commissionRates = [];

    if (symbols && symbols.length > 0) {
      for (const symbol of symbols) {
        const commissionRate = await this.makeSignedRequest(
          apiKey,
          apiSecret,
          useTestnet,
          "GET",
          BINANCE_ENDPOINTS.FUTURES_COMMISSION_RATE,
          {
            symbol: symbol || "",
          },
        );
        commissionRates.push(commissionRate);
      }
    }

    return commissionRates;
  }

  async getAccountInformation(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
  ) {
    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      useTestnet,
      "GET",
      BINANCE_ENDPOINTS.FUTURES_ACCOUNT,
    );
  }

  async getListenKey(apiKey: string, useTestnet: boolean) {
    return this.makeApiRequest(
      apiKey,
      useTestnet,
      "POST",
      BINANCE_ENDPOINTS.FUTURES_LISTEN_KEY,
    );
  }

  async keepAliveListenKey(apiKey: string, useTestnet: boolean) {
    return this.makeApiRequest(
      apiKey,
      useTestnet,
      "PUT",
      BINANCE_ENDPOINTS.FUTURES_LISTEN_KEY,
    );
  }

  async closeListenKey(apiKey: string, useTestnet: boolean) {
    return this.makeApiRequest(
      apiKey,
      useTestnet,
      "DELETE",
      BINANCE_ENDPOINTS.FUTURES_LISTEN_KEY,
    );
  }

  async getFuturesPositions(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
  ) {
    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      useTestnet,
      "GET",
      BINANCE_ENDPOINTS.FUTURES_POSITIONS,
    );
  }

  async getOpenOrders(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
    symbol?: string,
  ) {
    const queryParams: Record<string, string> = {};
    if (symbol) queryParams.symbol = symbol.toUpperCase();
    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      useTestnet,
      "GET",
      BINANCE_ENDPOINTS.FUTURES_OPEN_ORDERS,
      queryParams,
    );
  }

  async getPendingTpSl(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
    symbol?: string,
  ) {
    const queryParams: Record<string, string> = {};
    if (symbol) queryParams.symbol = symbol.toUpperCase();
    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      useTestnet,
      "GET",
      BINANCE_ENDPOINTS.FUTURES_PENDING_TP_SL,
      queryParams,
    );
  }

  async placeOrder(apiKey: string, apiSecret: string, params: OrderParams) {
    await this.setLeverage(
      apiKey,
      apiSecret,
      params.useTestnet,
      params.symbol,
      params.leverage,
    );
    await this.applyExchangeFilters(params, params.useTestnet);

    const queryParams: Record<string, string | number> = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
      timeInForce: params.timeInForce || TimeInForce.GTC,
    };

    if (params.type === OrderType.LIMIT) {
      if (!params.price) throw new Error("Price is required for LIMIT orders");
      queryParams.price = params.price;
    } else if (params.type === OrderType.MARKET) {
      queryParams.quantity = params.quantity;
      delete queryParams.timeInForce;
    }

    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      params.useTestnet,
      "POST",
      BINANCE_ENDPOINTS.FUTURES_ORDER,
      queryParams,
    );
  }

  async placeTakeProfitOrder(
    apiKey: string,
    apiSecret: string,
    params: TPSLParams,
  ) {
    if (!params.quantity && !params.closePosition) {
      throw Object.assign(
        new Error(
          "Either quantity or closePosition must be provided for a Take Profit order.",
        ),
        { status: 400 },
      );
    }

    await this.applyExchangeFilters(params, params.useTestnet);

    const queryParams: Record<string, string | number | boolean> = {
      symbol: params.symbol,
      side: params.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY,
      type: OrderType.TAKE_PROFIT_MARKET,
      triggerPrice: params.triggerPrice,
    };

    if (params.closePosition) {
      queryParams.closePosition = true;
      queryParams.algoType = "CONDITIONAL";
    } else if (params.quantity !== undefined) {
      queryParams.quantity = params.quantity;
    }

    if (params.workingType) queryParams.workingType = params.workingType;

    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      params.useTestnet,
      "POST",
      BINANCE_ENDPOINTS.FUTURES_ALGO_ORDER,
      queryParams,
    );
  }

  async placeStopLossOrder(
    apiKey: string,
    apiSecret: string,
    params: TPSLParams,
  ) {
    if (!params.quantity && !params.closePosition) {
      throw Object.assign(
        new Error(
          "Either quantity or closePosition must be provided for a Stop Loss order.",
        ),
        { status: 400 },
      );
    }

    await this.applyExchangeFilters(params, params.useTestnet);

    const queryParams: Record<string, string | number | boolean> = {
      symbol: params.symbol,
      side: params.side,
      type: OrderType.STOP_MARKET,
      triggerPrice: params.triggerPrice,
    };

    if (params.closePosition) {
      queryParams.closePosition = true;
      queryParams.algoType = "CONDITIONAL";
    } else if (params.quantity !== undefined) {
      queryParams.quantity = params.quantity;
    }

    if (params.workingType) queryParams.workingType = params.workingType;

    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      params.useTestnet,
      "POST",
      BINANCE_ENDPOINTS.FUTURES_ALGO_ORDER,
      queryParams,
    );
  }

  async closePosition(apiKey: string, apiSecret: string, params: TPSLParams) {
    const positions = await this.makeSignedRequest(
      apiKey,
      apiSecret,
      params.useTestnet,
      "GET",
      BINANCE_ENDPOINTS.FUTURES_POSITIONS,
      { symbol: params.symbol },
    );

    const position = Array.isArray(positions)
      ? positions.find(
          (p: any) => p.symbol.toUpperCase() === params.symbol.toUpperCase(),
        )
      : null;

    const positionAmt = parseFloat(position?.positionAmt ?? "0");
    if (!positionAmt || positionAmt === 0) {
      throw Object.assign(
        new Error(`No open position found for ${params.symbol}.`),
        { status: 400 },
      );
    }

    const quantity = Math.abs(positionAmt);

    const queryParams: Record<string, string | number> = {
      symbol: params.symbol,
      side: params.side,
      type: OrderType.MARKET,
      quantity,
      reduceOnly: "true",
    };

    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      params.useTestnet,
      "POST",
      BINANCE_ENDPOINTS.FUTURES_ORDER,
      queryParams,
    );
  }

  async cancelTpSl(
    apiKey: string,
    apiSecret: string,
    params: CancelTpSlParams,
  ) {
    if (!params.algoId) {
      throw Object.assign(new Error("Algo ID is required."), { status: 400 });
    }

    if (!params.clientAlgoId) {
      throw Object.assign(new Error("Client Algo ID is required."), {
        status: 400,
      });
    }

    const queryParams: Record<string, number | string> = {
      algoId: params.algoId,
      clientAlgoId: params.clientAlgoId,
    };

    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      params.useTestnet,
      "DELETE",
      BINANCE_ENDPOINTS.FUTURES_ALGO_ORDER,
      queryParams,
    );
  }

  async cancelOrder(
    apiKey: string,
    apiSecret: string,
    params: CancelOrderParams,
  ) {
    const queryParams: Record<string, string | number> = {
      symbol: params.symbol,
    };
    if (params.origClientOrderId) {
      queryParams.origClientOrderId = params.origClientOrderId;
    } else if (params.orderId) {
      queryParams.orderId = params.orderId;
    }

    return this.makeSignedRequest(
      apiKey,
      apiSecret,
      params.useTestnet,
      "DELETE",
      BINANCE_ENDPOINTS.FUTURES_ORDER,
      queryParams,
    );
  }
}
