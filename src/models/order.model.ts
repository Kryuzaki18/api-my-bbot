export enum OrderSide {
  BUY = "BUY",
  SELL = "SELL",
}

export enum OrderType {
  LIMIT = "LIMIT",
  MARKET = "MARKET",
  STOP = "STOP",
  STOP_MARKET = "STOP_MARKET",
  TAKE_PROFIT_MARKET = "TAKE_PROFIT_MARKET",
  TRAILING_STOP_MARKET = "TRAILING_STOP_MARKET",
}

export enum TimeInForce {
  GTC = "GTC", // Good Till Canceled
  GTE = "GTE", // Good-Till-Executed
  IOC = "IOC", // Immediate or Cancel
  FOK = "FOK", // Fill or Kill
}

export enum WorkingType {
  MARK_PRICE = "MARK_PRICE",
  CONTRACT_PRICE = "CONTRACT_PRICE",
}

export interface DefaultOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  quantity: number;
  timeInForce?: TimeInForce;
}

export interface OrderParams extends DefaultOrderParams {
  leverage: number;
  useTestnet: boolean;
}

export interface TPSLParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  triggerPrice: number;
  quantity?: number;
  closePosition?: boolean;
  workingType?: WorkingType;
  algotype?: string;
  reduceOnly?: boolean;
  useTestnet: boolean;
}

export interface CancelTpSlParams {
  algoId: number;
  clientAlgoId: string;
  useTestnet: boolean;
}

export interface CancelOrderParams {
  symbol: string;
  orderId: number;
  useTestnet: boolean;
}
