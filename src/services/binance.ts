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

  async placeOrder(apiKey: string, apiSecret: string, params: OrderParams) {
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
    const queryParams: Record<string, string | number | boolean> = {
      symbol: params.symbol,
      side: params.side,
      type: OrderType.TAKE_PROFIT_MARKET,
      stopPrice: params.stopPrice,
      timeInForce: TimeInForce.GTC,
    };

    if (params.closePosition) {
      queryParams.closePosition = true;
    } else if (params.quantity) {
      queryParams.quantity = params.quantity;
    } else {
      throw new Error('Either quantity or closePosition must be provided for a Take Profit order');
    }

    return this.makeSignedRequest(apiKey, apiSecret, params.useTestnet, 'POST', BINANCE_ENDPOINTS.FUTURES_ORDER, queryParams);
  }

  async cancelOrder(apiKey: string, apiSecret: string, params: CancelOrderParams) {
    const queryParams: Record<string, string | number> = {
      symbol: params.symbol,
      orderId: params.orderId,
    };

    return this.makeSignedRequest(apiKey, apiSecret, params.useTestnet, 'DELETE', BINANCE_ENDPOINTS.FUTURES_ORDER, queryParams);
  }
}
