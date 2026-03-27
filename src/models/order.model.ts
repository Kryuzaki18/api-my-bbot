export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET',
}

export enum TimeInForce {
  GTC = 'GTC', // Good Till Canceled
  IOC = 'IOC', // Immediate or Cancel
  FOK = 'FOK', // Fill or Kill
}

export interface OrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  useTestnet: boolean;
}

export interface TakeProfitParams {
  symbol: string;
  side: OrderSide;
  stopPrice: number;
  quantity?: number;
  closePosition?: boolean;
  useTestnet: boolean;
}

export interface CancelOrderParams {
  symbol: string;
  orderId: number;
  useTestnet: boolean;
}
