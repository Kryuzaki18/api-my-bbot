import { createHmac } from 'crypto';
import { request } from 'undici';
import { 
  BINANCE_FUTURES_PROD_URL, 
  BINANCE_FUTURES_TESTNET_URL, 
  BINANCE_ENDPOINTS 
} from '../config/constants.js';
import { 
  type OrderParams, 
  type TakeProfitParams, 
  type CancelOrderParams,
  OrderType,
  TimeInForce
} from '../models/order.model.js';

export class BinanceService {
  private static exchangeInfoCache: Record<string, any> = {};
  
  private static getBaseUrl(useTestnet: boolean) {
    return useTestnet ? BINANCE_FUTURES_TESTNET_URL : BINANCE_FUTURES_PROD_URL;
  }

  // A generic wrapper to handle Binance HMAC SHA-256 signatures, timestamps, and HTTP requests
  private async makeSignedRequest(
    apiKey: string,
    apiSecret: string,
    useTestnet: boolean,
    method: 'GET' | 'POST' | 'DELETE', 
    endpoint: string, 
    queryParams: Record<string, string | number | boolean> = {}
  ) {
    const baseUrl = BinanceService.getBaseUrl(useTestnet);

    // Binance requires timestamp for signed requests
    queryParams.timestamp = Date.now();

    const queryString = new URLSearchParams(queryParams as any).toString();
    const signature = createHmac('sha256', apiSecret).update(queryString).digest('hex');
    const finalQueryString = `${queryString}&signature=${signature}`;

    const { statusCode, body } = await request(`${baseUrl}${endpoint}?${finalQueryString}`, {
      method,
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await body.json();

    if (statusCode !== 200) {
      throw Object.assign(new Error('Binance API Error'), { status: statusCode, details: responseData });
    }

    return responseData;
  }

  async getAccountInformation(apiKey: string, apiSecret: string, useTestnet: boolean) {
    // Standard endpoint to test credentials returning balances and account metadata
    return this.makeSignedRequest(apiKey, apiSecret, useTestnet, 'GET', '/fapi/v2/account');
  }

  // A generic wrapper for Binance requests that only require an API Key
  private async makeApiRequest(
    apiKey: string,
    useTestnet: boolean,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
    endpoint: string
  ) {
    const baseUrl = BinanceService.getBaseUrl(useTestnet);

    const { statusCode, body } = await request(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await body.json();

    if (statusCode !== 200) {
      throw Object.assign(new Error('Binance API Error'), { status: statusCode, details: responseData });
    }

    return responseData;
  }

  async getListenKey(apiKey: string, useTestnet: boolean) {
    return this.makeApiRequest(apiKey, useTestnet, 'POST', '/fapi/v1/listenKey');
  }

  async keepAliveListenKey(apiKey: string, useTestnet: boolean) {
    return this.makeApiRequest(apiKey, useTestnet, 'PUT', '/fapi/v1/listenKey');
  }

  async closeListenKey(apiKey: string, useTestnet: boolean) {
    return this.makeApiRequest(apiKey, useTestnet, 'DELETE', '/fapi/v1/listenKey');
  }


  private async getExchangeInfo(useTestnet: boolean) {
    const cacheKey = useTestnet ? 'testnet' : 'mainnet';
    if (!BinanceService.exchangeInfoCache[cacheKey]) {
      BinanceService.exchangeInfoCache[cacheKey] = await this.makeApiRequest('', useTestnet, 'GET', '/fapi/v1/exchangeInfo');
    }
    return BinanceService.exchangeInfoCache[cacheKey];
  }

  private formatPrecision(value: number, stepSize: string): number {
    const stepSizeNum = parseFloat(stepSize);
    if (stepSizeNum <= 0) return value;
    
    // Calculate decimal places in stepSize
    let precision = 0;
    if (stepSize.indexOf('.') >= 0) {
      precision = (stepSize.split('.')[1] || '').replace(/0+$/, '').length;
    }
    
    // Round down to the nearest multiple of stepSize to avoid exceeding limits
    const rounded = Math.floor(value / stepSizeNum) * stepSizeNum;
    return Number(rounded.toFixed(precision));
  }

  private async applyExchangeFilters(params: any, useTestnet: boolean) {
    try {
      const info = await this.getExchangeInfo(useTestnet);
      const symbolInfo = info.symbols.find((s: any) => s.symbol === params.symbol);
      if (!symbolInfo) return;

      const lotSizeFilter = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
      if (lotSizeFilter && params.quantity !== undefined) {
        params.quantity = this.formatPrecision(params.quantity, lotSizeFilter.stepSize);
        if (params.quantity <= 0) {
          throw Object.assign(new Error(`Order quantity is too small. The minimum allowed step size for ${params.symbol} is ${lotSizeFilter.stepSize}. Please increase your USD amount.`), { status: 400 });
        }
      }

      const priceFilter = symbolInfo.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
      if (priceFilter) {
        if (params.price !== undefined) {
          params.price = this.formatPrecision(params.price, priceFilter.tickSize);
        }
        if (params.stopPrice !== undefined) {
          params.stopPrice = this.formatPrecision(params.stopPrice, priceFilter.tickSize);
        }
      }
    } catch (e: any) {

    console.log('\x1b[31m'+ e +'\x1b[0m');

      if (e.status === 400) throw e;
      console.warn('Failed to fetch/apply exchange info filters:', e);
    }
  }

  async placeOrder(apiKey: string, apiSecret: string, params: OrderParams) {
    if (params.leverage !== undefined) {
      await this.makeSignedRequest(apiKey, apiSecret, params.useTestnet, 'POST', '/fapi/v1/leverage', {
        symbol: params.symbol,
        leverage: params.leverage,
      });
    }

    await this.applyExchangeFilters(params, params.useTestnet);

    const queryParams: Record<string, string | number> = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
    };

    if (params.type === OrderType.LIMIT) {
      if (!params.price) throw new Error('Price is required for LIMIT orders');
      queryParams.price = params.price;
      queryParams.timeInForce = TimeInForce.GTC;
    }

    return this.makeSignedRequest(apiKey, apiSecret, params.useTestnet, 'POST', BINANCE_ENDPOINTS.FUTURES_ORDER, queryParams);
  }

  async placeTakeProfitOrder(apiKey: string, apiSecret: string, params: TakeProfitParams) {
    await this.applyExchangeFilters(params, params.useTestnet);

    const queryParams: Record<string, string | number | boolean> = {
      symbol: params.symbol,
      side: params.side,
      type: OrderType.TAKE_PROFIT_MARKET,
      triggerPrice: params.stopPrice,
      algoType: 'CONDITIONAL',
    };

    if (params.closePosition) {
      queryParams.closePosition = true;
    } else if (params.quantity) {
      queryParams.quantity = params.quantity;
    } else {
      throw new Error('Either quantity or closePosition must be provided for a Take Profit order');
    }

    return this.makeSignedRequest(apiKey, apiSecret, params.useTestnet, 'POST', '/fapi/v1/algoOrder', queryParams);
  }

  async placeStopLossOrder(apiKey: string, apiSecret: string, params: TakeProfitParams) {
    await this.applyExchangeFilters(params, params.useTestnet);

    const queryParams: Record<string, string | number | boolean> = {
      symbol: params.symbol,
      side: params.side,
      type: OrderType.STOP_MARKET,
      triggerPrice: params.stopPrice,
      algoType: 'CONDITIONAL'
    };

    if (params.closePosition) {
      queryParams.closePosition = true;
    } else if (params.quantity) {
      queryParams.quantity = params.quantity;
    } else {
      throw new Error('Either quantity or closePosition must be provided for a Stop Loss order');
    }

    return this.makeSignedRequest(apiKey, apiSecret, params.useTestnet, 'POST', '/fapi/v1/algoOrder', queryParams);
  }

  async getOpenOrders(apiKey: string, apiSecret: string, useTestnet: boolean, symbol?: string) {
    const queryParams: Record<string, string> = {};
    if (symbol) queryParams.symbol = symbol;
    return this.makeSignedRequest(apiKey, apiSecret, useTestnet, 'GET', BINANCE_ENDPOINTS.FUTURES_OPEN_ORDERS, queryParams);
  }

  async getOpenAlgoOrders(apiKey: string, apiSecret: string, useTestnet: boolean, symbol?: string) {
    const queryParams: Record<string, string> = {};
    if (symbol) queryParams.symbol = symbol;
    return this.makeSignedRequest(apiKey, apiSecret, useTestnet, 'GET', '/fapi/v1/openAlgoOrders', queryParams);
  }

  async cancelOrder(apiKey: string, apiSecret: string, params: CancelOrderParams) {
    const queryParams: Record<string, string | number> = {
      symbol: params.symbol,
      orderId: params.orderId,
    };

    return this.makeSignedRequest(apiKey, apiSecret, params.useTestnet, 'DELETE', BINANCE_ENDPOINTS.FUTURES_ORDER, queryParams);
  }
}
