import {
  DerivativesTradingUsdsFutures,
  DERIVATIVES_TRADING_USDS_FUTURES_REST_API_TESTNET_URL,
  type DerivativesTradingUsdsFuturesRestAPI,
} from "@binance/derivatives-trading-usds-futures";
import { Algo, type AlgoRestAPI } from "@binance/algo";
import {
  type OrderParams,
  type TPSLParams,
  type CancelOrderParams,
  OrderType,
  TimeInForce,
  OrderSide,
  type CancelTpSlParams,
} from "../models/order.model.js";

// ---------------------------------------------------------------------------
// Client factories
//
// Both packages recommend creating a client per-request (or per-user) rather
// than sharing a singleton, because credentials are baked into the config at
// construction time. These lightweight factories keep user credentials
// isolated and avoid any shared mutable state.
// ---------------------------------------------------------------------------

function createFuturesClient(
  apiKey: string,
  apiSecret: string,
  useTestnet: boolean,
) {
  return new DerivativesTradingUsdsFutures({
    configurationRestAPI: {
      apiKey,
      apiSecret,
      ...(useTestnet && {
        basePath: DERIVATIVES_TRADING_USDS_FUTURES_REST_API_TESTNET_URL,
      }),
    },
  });
}

function createAlgoClient(apiKey: string, apiSecret: string) {
  return new Algo({
    configurationRestAPI: { apiKey, apiSecret },
  });
}

// ---------------------------------------------------------------------------
// Exchange info cache — avoids hammering the exchange info endpoint on every
// order. Keyed by "mainnet" | "testnet".
// ---------------------------------------------------------------------------
const exchangeInfoCache: Record<string, DerivativesTradingUsdsFuturesRestAPI.ExchangeInformationResponse> = {};

export class BinanceService {
  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async getExchangeInfo(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
  ): Promise<DerivativesTradingUsdsFuturesRestAPI.ExchangeInformationResponse> {
    const cacheKey = useTestnet ? "testnet" : "mainnet";
    if (!exchangeInfoCache[cacheKey]) {
      const client = createFuturesClient(apiKey, apiSecret, useTestnet);
      const res = await client.restAPI!.exchangeInformation();
      exchangeInfoCache[cacheKey] = await res.data();
    }
    return exchangeInfoCache[cacheKey];
  }

  private async applyExchangeFilters(
    params: any,
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
  ) {
    try {
      const info = await this.getExchangeInfo(apiKey, apiSecret, useTestnet);
      const symbolInfo = info.symbols?.find(
        (s) => s.symbol?.toUpperCase() === params.symbol.toUpperCase(),
      );
      if (!symbolInfo) return;

      const lotSizeFilter = symbolInfo.filters?.find(
        (f: any) => f.filterType === "LOT_SIZE",
      ) as any;
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

      const priceFilter = symbolInfo.filters?.find(
        (f: any) => f.filterType === "PRICE_FILTER",
      ) as any;
      if (priceFilter) {
        if (params.price !== undefined) {
          params.price = this.roundToTickSize(params.price, priceFilter.tickSize);
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
  ): Promise<void> {
    const client = createFuturesClient(apiKey, apiSecret, useTestnet);
    const res = await client.restAPI!.changeInitialLeverage({ symbol, leverage });
    await res.data();
  }

  // -------------------------------------------------------------------------
  // Market data
  // -------------------------------------------------------------------------

  async getKlines(symbol: string, interval: string): Promise<any[]> {
    // Klines are public — no credentials needed, always use mainnet.
    const client = createFuturesClient("", "", false);
    const res = await client.restAPI!.klineCandlestickData({
      symbol,
      // The interval string values ("1m", "15m", etc.) match the enum values
      // exactly, so a cast is safe here.
      interval: interval as DerivativesTradingUsdsFuturesRestAPI.KlineCandlestickDataIntervalEnum,
      limit: 150,
    });
    const raw = (await res.data()) as any[];

    if (raw?.length > 0) {
      return raw.map((candle: any) => ({
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
      }));
    }

    return [];
  }

  // -------------------------------------------------------------------------
  // Account
  // -------------------------------------------------------------------------

  async getAccountInformation(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
  ): Promise<any> {
    const client = createFuturesClient(apiKey, apiSecret, useTestnet);
    const res = await client.restAPI!.accountInformationV2();
    return res.data();
  }

  async getLeverageBracket(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
    symbol?: string,
  ): Promise<any> {
    const client = createFuturesClient(apiKey, apiSecret, useTestnet);
    const res = await client.restAPI!.notionalAndLeverageBrackets(
      symbol ? { symbol } : {},
    );
    return res.data();
  }

  async getCommissionRate(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
    symbols?: string[],
  ): Promise<any[]> {
    if (!symbols || symbols.length === 0) return [];

    const client = createFuturesClient(apiKey, apiSecret, useTestnet);
    const commissionRates: any[] = [];

    for (const symbol of symbols) {
      const res = await client.restAPI!.userCommissionRate({ symbol });
      commissionRates.push(await res.data());
    }

    return commissionRates;
  }

  // -------------------------------------------------------------------------
  // Listen key (user data stream)
  // -------------------------------------------------------------------------

  async getListenKey(apiKey: string, useTestnet: boolean): Promise<any> {
    const client = createFuturesClient(apiKey, "", useTestnet);
    const res = await client.restAPI!.startUserDataStream();
    return res.data();
  }

  async keepAliveListenKey(apiKey: string, useTestnet: boolean): Promise<any> {
    const client = createFuturesClient(apiKey, "", useTestnet);
    const res = await client.restAPI!.keepaliveUserDataStream();
    return res.data();
  }

  async closeListenKey(apiKey: string, useTestnet: boolean): Promise<any> {
    const client = createFuturesClient(apiKey, "", useTestnet);
    const res = await client.restAPI!.closeUserDataStream();
    return res.data();
  }

  // -------------------------------------------------------------------------
  // Positions & open orders
  // -------------------------------------------------------------------------

  async getFuturesPositions(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
  ): Promise<any> {
    const client = createFuturesClient(apiKey, apiSecret, useTestnet);
    const res = await client.restAPI!.positionInformationV2();
    return res.data();
  }

  async getOpenOrders(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
  ): Promise<any> {
    const client = createFuturesClient(apiKey, apiSecret, useTestnet);
    const res = await client.restAPI!.currentAllOpenOrders();
    return res.data();
  }

  // -------------------------------------------------------------------------
  // Algo / conditional orders
  //
  // - getPendingTpSl / cancelTpSl use @binance/algo (sapi/v1/algo/futures/*)
  // - placeTakeProfitOrder / placeStopLossOrder use newAlgoOrder from
  //   @binance/derivatives-trading-usds-futures (fapi/v1/order/algo with
  //   algoType=CONDITIONAL), which is the correct endpoint for TP/SL.
  // -------------------------------------------------------------------------

  /**
   * Query open conditional (TP/SL) algo orders.
   * Uses @binance/algo: GET /sapi/v1/algo/futures/openOrders
   */
  async getPendingTpSl(
    apiKey: string,
    apiSecret: string,
    _useTestnet: boolean,
  ): Promise<AlgoRestAPI.QueryCurrentAlgoOpenOrdersFutureAlgoResponse> {
    const client = createAlgoClient(apiKey, apiSecret);
    const res = await client.restAPI!.queryCurrentAlgoOpenOrdersFutureAlgo();
    return res.data();
  }

  /**
   * Cancel an active conditional (TP/SL) algo order.
   * Uses @binance/algo: DELETE /sapi/v1/algo/futures/order
   */
  async cancelTpSl(
    apiKey: string,
    apiSecret: string,
    params: CancelTpSlParams,
  ): Promise<AlgoRestAPI.CancelAlgoOrderFutureAlgoResponse> {
    if (!params.algoId) {
      throw Object.assign(new Error("Algo ID is required."), { status: 400 });
    }
    const client = createAlgoClient(apiKey, apiSecret);
    const res = await client.restAPI!.cancelAlgoOrderFutureAlgo({
      algoId: params.algoId,
    });
    return res.data();
  }

  // -------------------------------------------------------------------------
  // Order placement
  // -------------------------------------------------------------------------

  async placeOrder(
    apiKey: string,
    apiSecret: string,
    params: OrderParams,
  ): Promise<any> {
    await this.setLeverage(
      apiKey,
      apiSecret,
      params.useTestnet,
      params.symbol,
      params.leverage,
    );
    await this.applyExchangeFilters(params, apiKey, apiSecret, params.useTestnet);

    const client = createFuturesClient(apiKey, apiSecret, params.useTestnet);

    const orderParams: any = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
    };

    if (params.type === OrderType.LIMIT) {
      if (!params.price) throw new Error("Price is required for LIMIT orders");
      orderParams.price = params.price;
      orderParams.timeInForce = params.timeInForce || TimeInForce.GTC;
    }
    // MARKET orders do not use timeInForce

    const res = await client.restAPI!.newOrder(orderParams);
    return res.data();
  }

  async placeTakeProfitOrder(
    apiKey: string,
    apiSecret: string,
    params: TPSLParams,
  ): Promise<any> {
    if (!params.quantity && !params.closePosition) {
      throw Object.assign(
        new Error(
          "Either quantity or closePosition must be provided for a Take Profit order.",
        ),
        { status: 400 },
      );
    }

    await this.applyExchangeFilters(params, apiKey, apiSecret, params.useTestnet);

    const client = createFuturesClient(apiKey, apiSecret, params.useTestnet);

    const orderParams: any = {
      algoType: "CONDITIONAL",
      symbol: params.symbol,
      side: params.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY,
      type: OrderType.TAKE_PROFIT_MARKET,
      triggerPrice: params.triggerPrice,
    };

    if (params.closePosition) {
      orderParams.closePosition = "true";
    } else if (params.quantity !== undefined) {
      orderParams.quantity = params.quantity;
    }

    if (params.workingType) orderParams.workingType = params.workingType;

    const res = await client.restAPI!.newAlgoOrder(orderParams);
    return res.data();
  }

  async placeStopLossOrder(
    apiKey: string,
    apiSecret: string,
    params: TPSLParams,
  ): Promise<any> {
    if (!params.quantity && !params.closePosition) {
      throw Object.assign(
        new Error(
          "Either quantity or closePosition must be provided for a Stop Loss order.",
        ),
        { status: 400 },
      );
    }

    await this.applyExchangeFilters(params, apiKey, apiSecret, params.useTestnet);

    const client = createFuturesClient(apiKey, apiSecret, params.useTestnet);

    const orderParams: any = {
      algoType: "CONDITIONAL",
      symbol: params.symbol,
      side: params.side,
      type: OrderType.STOP_MARKET,
      triggerPrice: params.triggerPrice,
    };

    if (params.closePosition) {
      orderParams.closePosition = "true";
    } else if (params.quantity !== undefined) {
      orderParams.quantity = params.quantity;
    }

    if (params.workingType) orderParams.workingType = params.workingType;

    const res = await client.restAPI!.newAlgoOrder(orderParams);
    return res.data();
  }

  async closePosition(
    apiKey: string,
    apiSecret: string,
    params: TPSLParams,
  ): Promise<any> {
    const client = createFuturesClient(apiKey, apiSecret, params.useTestnet);

    // Fetch the open position to determine the exact quantity to close
    const positionsRes = await client.restAPI!.positionInformationV2({
      symbol: params.symbol,
    });
    const positions = (await positionsRes.data()) as any[];

    const position = Array.isArray(positions)
      ? positions.find(
          (p: any) => p.symbol?.toUpperCase() === params.symbol.toUpperCase(),
        )
      : null;

    const positionAmt = parseFloat(position?.positionAmt ?? "0");
    if (!positionAmt || positionAmt === 0) {
      throw Object.assign(
        new Error(`No open position found for ${params.symbol}.`),
        { status: 400 },
      );
    }

    const res = await client.restAPI!.newOrder({
      symbol: params.symbol,
      side: params.side as any,
      type: OrderType.MARKET as any,
      quantity: Math.abs(positionAmt),
      reduceOnly: "true",
    });
    return res.data();
  }

  async cancelOrder(
    apiKey: string,
    apiSecret: string,
    params: CancelOrderParams,
  ): Promise<any> {
    if (!params.orderId && !params.origClientOrderId) {
      throw Object.assign(
        new Error("Either orderId or origClientOrderId is required."),
        { status: 400 },
      );
    }

    const client = createFuturesClient(apiKey, apiSecret, params.useTestnet);

    const cancelParams: any = { symbol: params.symbol };
    if (params.origClientOrderId) {
      cancelParams.origClientOrderId = params.origClientOrderId;
    } else if (params.orderId) {
      cancelParams.orderId = params.orderId;
    }

    const res = await client.restAPI!.cancelOrder(cancelParams);
    return res.data();
  }
}
